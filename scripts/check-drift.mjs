#!/usr/bin/env node
/**
 * @file scripts/check-drift.mjs
 * @description CLI: `free-coding-models --check-drift` — diff `sources.js` against the live
 *              models.dev catalog and print a human-readable drift report. Exits 1 on
 *              mismatch (so CI fails the build), 0 on clean.
 *
 * @details
 *   📖 Usage:
 *   📖   node scripts/check-drift.mjs                     # threshold = 0 (any drift = fail)
 *   📖   node scripts/check-drift.mjs --threshold 5        # only fail if 5+ mismatches
 *   📖   node scripts/check-drift.mjs --json               # output as JSON
 *   📖   node scripts/check-drift.mjs --no-fail            # always exit 0 (report only)
 *   📖   node scripts/check-drift.mjs --fixture path.json  # use a local fixture instead of fetch
 *   📖   pnpm check:drift                                 # convenience npm script
 *
 *   📖 Exit codes:
 *   📖   0  No drift (or below threshold)
 *   📖   1  Drift detected
 *   📖   2  Fetch failed (network error)
 *   📖   3  Invalid arguments
 *
 *   📖 Cross-surface: same code path as the TUI footer chip + /health endpoint.
 *   📖 The drift list itself is also written to stderr as a JSON blob when --json
 *   📖 is passed, for easy piping into jq / GitHub Actions summary.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { fetchModelsDevCatalog, clearModelsDevCache } from '../src/core/models-dev-fetcher.js'
import { buildModelIndex } from '../src/core/models-dev-index.js'
import { detectDrift, summarizeDrift, formatDriftReport } from '../src/core/models-drift.js'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(here, '..')

// ─── CLI arg parsing ─────────────────────────────────────────────────────────

function parseCliArgs(argv) {
  const out = { threshold: 0, json: false, noFail: false, fixture: null, silent: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--threshold' || a === '--drift-threshold') {
      const v = argv[++i]
      const n = parseInt(v, 10)
      if (!Number.isFinite(n) || n < 0) {
        console.error(`error: --threshold must be a non-negative integer (got: ${v})`)
        process.exit(3)
      }
      out.threshold = n
    } else if (a === '--json') {
      out.json = true
    } else if (a === '--no-fail') {
      out.noFail = true
    } else if (a === '--fixture') {
      out.fixture = argv[++i]
    } else if (a === '--silent') {
      out.silent = true
    } else if (a === '--help' || a === '-h') {
      console.log(`
Usage: free-coding-models --check-drift [options]

Options:
  --threshold N        Only fail when N+ mismatches are found (default: 0)
  --drift-threshold N  Alias for --threshold
  --json               Output the report as JSON on stdout
  --no-fail            Always exit 0 (report only, useful for weekly issues)
  --fixture path.json  Use a local catalog file instead of fetching from models.dev
  --silent             Suppress all non-error output
  --help, -h           Show this help

Exit codes:
  0  No drift (or below threshold)
  1  Drift detected
  2  Fetch failed (network error)
  3  Invalid arguments
`)
      process.exit(0)
    } else {
      console.error(`error: unknown argument: ${a}`)
      process.exit(3)
    }
  }
  return out
}

// ─── Load sources.js MODELS ───────────────────────────────────────────────────

/**
 * 📖 sources.js uses ESM `export const MODELS = [...]` so we can import it directly.
 * 📖 We only need the MODELS array for drift detection.
 */
async function loadSourcesModels() {
  const mod = await import(join(projectRoot, 'sources.js'))
  if (!mod || !Array.isArray(mod.MODELS)) {
    throw new Error('sources.js did not export a MODELS array')
  }
  return mod.MODELS
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseCliArgs(process.argv.slice(2))

  // 📖 Step 1: Load sources.js
  let models
  try {
    models = await loadSourcesModels()
  } catch (err) {
    console.error(`error: failed to load sources.js: ${err.message}`)
    process.exit(3)
  }

  // 📖 Step 2: Get the models.dev catalog (fetch or fixture)
  let catalog = null
  if (args.fixture) {
    try {
      const raw = readFileSync(args.fixture, 'utf-8')
      catalog = JSON.parse(raw)
    } catch (err) {
      console.error(`error: failed to read fixture ${args.fixture}: ${err.message}`)
      process.exit(3)
    }
  } else {
    clearModelsDevCache()
    catalog = await fetchModelsDevCatalog({ retries: 3, retryDelayMs: 250, silent: false })
    if (!catalog) {
      console.error('error: failed to fetch models.dev catalog (network error)')
      process.exit(2)
    }
  }

  // 📖 Step 3: Run drift detection
  const index = buildModelIndex(catalog)
  const drift = detectDrift(models, catalog, { index, threshold: args.threshold })
  const summary = summarizeDrift(drift)

  // 📖 Step 4: Output
  if (args.json) {
    process.stdout.write(JSON.stringify({ summary, mismatches: drift }, null, 2) + '\n')
  } else if (!args.silent) {
    process.stdout.write(formatDriftReport(drift) + '\n')
  }

  // 📖 Step 5: Exit code
  if (drift.length === 0) {
    process.exit(0)
  }
  if (args.noFail) {
    process.exit(0)
  }
  process.exit(1)
}

main().catch(err => {
  console.error(`error: unhandled exception: ${err.stack ?? err.message}`)
  process.exit(3)
})
