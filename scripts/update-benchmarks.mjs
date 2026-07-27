#!/usr/bin/env node
/**
 * @file scripts/update-benchmarks.mjs
 * @description Regenerate `src/data/benchmarks.json` from a fresh data source.
 *              Called at release time (or manually via `pnpm update:benchmarks`).
 *              The committed JSON is what the runtime reads — the fetch only happens
 *              here, then the data is committed alongside the version bump.
 *
 * @details
 *   📖 Usage:
 *   📖   node scripts/update-benchmarks.mjs                    # try to fetch live
 *   📖   node scripts/update-benchmarks.mjs --fixture PATH     # use a local JSON file
 *   📖   node scripts/update-benchmarks.mjs --dry-run          # print to stdout, do not write
 *   📖   pnpm update:benchmarks                                # convenience
 *
 *   📖 Data sources (in priority order):
 *   📖   1. --fixture PATH   (for tests / offline runs)
 *   📖   2. Live fetch from models.dev (the same source we use for drift detection)
 *   📖   3. Abort with non-zero exit if neither is available
 *
 *   📖 Output: src/data/benchmarks.json — same shape as the current seed (see the
 *   📖 existing file for the schema). The script merges the fetched data with the
 *   📖 existing file so curated values are preserved when the source is missing them.
 *
 *   📖 Exit codes:
 *   📖   0  Success (or --dry-run)
 *   📖   1  Fetch failed + no fixture + no existing file
 *   📖   2  Invalid arguments
 *   📖   3  Output write failed
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(here, '..')
const OUTPUT_PATH = join(projectRoot, 'src', 'data', 'benchmarks.json')

// ─── CLI arg parsing ─────────────────────────────────────────────────────────

function parseCliArgs(argv) {
  const out = { fixture: null, dryRun: false, silent: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--fixture') out.fixture = argv[++i]
    else if (a === '--dry-run') out.dryRun = true
    else if (a === '--silent') out.silent = true
    else if (a === '--help' || a === '-h') {
      console.log(`
Usage: update-benchmarks [options]

Options:
  --fixture PATH   Use a local JSON file instead of fetching from models.dev
  --dry-run        Print the new JSON to stdout instead of writing to disk
  --silent         Suppress non-error output
  --help, -h       Show this help

Exit codes:
  0  Success (or --dry-run)
  1  Fetch failed + no fixture + no existing file
  2  Invalid arguments
  3  Output write failed
`)
      process.exit(0)
    } else {
      console.error(`error: unknown argument: ${a}`)
      process.exit(2)
    }
  }
  return out
}

// ─── Data source ─────────────────────────────────────────────────────────────

async function fetchLive() {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12_000)
  try {
    const res = await fetch('https://models.dev/models.json', {
      headers: { 'User-Agent': 'free-coding-models-benchmarks-updater' },
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 📖 Synthesize an extended-benchmark entry from a models.dev model.
 * 📖 Most fields are derivable from the basic metadata; the rest is left null
 * 📖 and gets filled in by future fetches.
 */
function synthesizeFromModelsDev(modelId, rawEntry) {
  const limit = rawEntry.limit || {}
  const modalities = rawEntry.modalities || {}
  const vision = Array.isArray(modalities.input)
    ? modalities.input.some(m => typeof m === 'string' && /image|video/i.test(m))
    : false
  return {
    codingIndex: null,
    mathIndex: null,
    agenticIndex: null,
    reasoningIndex: null,
    mmluPro: null,
    gpqa: null,
    hle: null,
    contextWindow: typeof limit.context === 'number' ? limit.context : null,
    supportsReasoning: rawEntry.reasoning === true,
    supportsVision: vision,
    lastUpdated: new Date().toISOString().slice(0, 10),
    originalModel: rawEntry.name || modelId,
    // 📖 provenance marker — lets the TUI show "🤖 from models.dev" vs "📦 curated"
    source: 'models.dev',
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseCliArgs(process.argv.slice(2))

  // 📖 Step 1: load existing seed (preserve curated values when source is missing fields)
  let existing = {}
  if (existsSync(OUTPUT_PATH)) {
    try {
      existing = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8'))
      if (!existing || typeof existing !== 'object') existing = {}
    } catch {
      existing = {}
    }
  }
  const existingMeta = existing._meta ?? {}
  const curatedModels = { ...existing }
  delete curatedModels._meta

  // 📖 Step 2: get the source data
  let sourceData = null
  if (args.fixture) {
    try {
      sourceData = JSON.parse(readFileSync(args.fixture, 'utf-8'))
    } catch (err) {
      console.error(`error: failed to read fixture ${args.fixture}: ${err.message}`)
      process.exit(1)
    }
  } else {
    try {
      sourceData = await fetchLive()
    } catch (err) {
      if (!args.silent) {
        console.error(`warn: live fetch failed: ${err.message}`)
      }
      if (Object.keys(curatedModels).length === 0) {
        console.error('error: no live data + no existing file to fall back on')
        process.exit(1)
      }
      // 📖 Fall back to the existing catalog (no new fields, but don't fail)
      if (!args.silent) {
        console.error('warn: keeping existing benchmarks.json unchanged')
      }
      process.exit(0)
    }
  }

  // 📖 Step 3: detect format (flat or nested) and synthesize new entries
  const synthesized = {}
  const entries = Object.entries(sourceData || {})
  const isFlat = entries.length > 0 && entries.every(([k, v]) => {
    if (!v || typeof v !== 'object') return false
    if (k.includes('/')) return typeof v.limit === 'object' || typeof v.id === 'string'
    return false
  })

  if (isFlat) {
    for (const [idKey, rawEntry] of entries) {
      if (!rawEntry || typeof rawEntry !== 'object') continue
      synthesized[idKey] = synthesizeFromModelsDev(idKey, rawEntry)
    }
  } else {
    for (const [providerKey, providerBucket] of entries) {
      if (!providerBucket || typeof providerBucket !== 'object') continue
      const models = providerBucket.models
      if (!models || typeof models !== 'object') continue
      for (const [modelId, rawEntry] of Object.entries(models)) {
        const idKey = `${providerKey}/${modelId}`
        synthesized[idKey] = synthesizeFromModelsDev(idKey, rawEntry)
      }
    }
  }

  // 📖 Step 4: merge — synthesized entries fill in the basics (ctx, vision, reasoning);
  // 📖 curated entries preserve the rich benchmark scores. The merger prefers curated
  // 📖 for any field that already has a non-null value.
  const merged = { ...synthesized }
  for (const [key, curated] of Object.entries(curatedModels)) {
    if (!curated || typeof curated !== 'object') continue
    const base = merged[key] ?? {}
    merged[key] = {
      ...base,
      ...curated,  // 📖 curated wins for any field it has
      // 📖 Preserve source field — 'curated' overrides 'models.dev' if the entry
      // 📖 already had a value (means we have a richer dataset from a prior commit)
      source: curated.source ?? 'curated',
    }
  }

  // 📖 Step 5: attach _meta
  const newMeta = {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString().slice(0, 10),
    source: 'models.dev (auto) + curated (manual)',
    notes: existingMeta.notes ?? 'Refreshed by scripts/update-benchmarks.mjs',
  }
  const finalOutput = { _meta: newMeta, ...merged }

  // 📖 Step 6: write
  const json = JSON.stringify(finalOutput, null, 2) + '\n'
  if (args.dryRun) {
    process.stdout.write(json)
    process.exit(0)
  }
  try {
    writeFileSync(OUTPUT_PATH, json, 'utf-8')
    if (!args.silent) {
      console.log(`✓ wrote ${OUTPUT_PATH} (${merged.length} entries)`)
    }
    process.exit(0)
  } catch (err) {
    console.error(`error: failed to write ${OUTPUT_PATH}: ${err.message}`)
    process.exit(3)
  }
}

main().catch(err => {
  console.error(`error: unhandled exception: ${err.stack ?? err.message}`)
  process.exit(2)
})
