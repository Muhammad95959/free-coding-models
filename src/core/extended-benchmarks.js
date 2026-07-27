/**
 * @file extended-benchmarks.js
 * @description Extended per-model benchmark catalog (Coding/Math/Agentic/Reasoning indices
 *              + MMLU-Pro / GPQA / HLE + reasoning/vision support) with O(key length) prefix-indexed
 *              lookup and lazy JSON load.
 *
 * @details
 *   📖 Why this exists:
 *   📖 - `sources.js` carries a single SWE-bench score per model — useful for tier, but
 *   📖   blind to a model's math/reasoning/vision capabilities. The extended catalog
 *   📖   adds 6 indices (Coding, Math, Agentic, Reasoning, MMLU-Pro, GPQA, HLE) plus
 *   📖   context-window, reasoning-support and vision-support flags.
 *   📖 - With ~50–500 catalog entries, a linear lookup on every TUI re-render is wasteful.
 *   📖   We build a prefix index on the `-`-separated model id so lookups only visit
 *   📖   candidate variants of the base model (e.g. "deepseek-ai/deepseek-v4-pro" falls
 *   📖   back to "deepseek-ai/deepseek-v4-pro" exact, then "deepseek-ai/deepseek-v4",
 *   📖   then "deepseek-ai/deepseek", …) — O(key length) instead of O(catalog size).
 *   📖 - The JSON file is large but only needed when the user actually looks at model
 *   📖   metadata. A Proxy deferral defers readFileSync until first property access.
 *
 *   📖 Data shape (see src/data/benchmarks.json):
 *   📖   {
 *   📖     "_meta": { "schemaVersion": 1, "lastUpdated": "...", "source": "..." },
 *   📖     "<modelId>": {
 *   📖       "codingIndex":    72.4,   // 0–100
 *   📖       "mathIndex":      68.1,   // 0–100
 *   📖       "agenticIndex":   55.0,   // 0–100
 *   📖       "reasoningIndex": 71.2,   // 0–100
 *   📖       "mmluPro":        78.3,   // 0–100
 *   📖       "gpqa":           54.0,   // 0–100
 *   📖       "hle":            12.1,   // 0–100  (Humanity's Last Exam)
 *   📖       "contextWindow":  1000000,
 *   📖       "supportsReasoning": true,
 *   📖       "supportsVision":    false,
 *   📖       "lastUpdated":    "2026-07-20",
 *   📖       "originalModel":  "DeepSeek V4 Pro"
 *   📖     },
 *   📖     ...
 *   📖   }
 *
 *   📖 Cross-surface: pure logic, consumed everywhere — CLI TUI, Web Dashboard, Desktop.
 *
 * @functions
 *   → getBenchmarksDataPath()                — Resolves the JSON file path
 *   → getCatalog()                           — Lazy-loaded catalog (Proxy)
 *   → lookupExtendedBenchmark(modelId, opts?) — Returns the entry (or null) for a model
 *   → buildPrefixIndex(catalog)              — Builds the prefix index (idempotent, cached)
 *   → getCatalogStats()                      — { total, byField, lastUpdated }
 *   → mergeExtendedBenchmark(model, entry?)  — Helper to overlay onto a result object
 *   → EXTENDED_BENCH_FIELDS                 — The list of overlay field names
 *
 * @exports getBenchmarksDataPath, getCatalog, lookupExtendedBenchmark, getCatalogStats,
 *          mergeExtendedBenchmark, EXTENDED_BENCH_FIELDS
 *
 * @see src/data/benchmarks.json                — The committed seed catalog
 * @see scripts/update-benchmarks.mjs           — Regenerates the JSON (release-time)
 * @see src/core/utils.js                       — parseSweToNum, parseCtxToK (related)
 * @see src/core/model-merger.js                — Calls mergeExtendedBenchmark at merge time
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ─── Constants ────────────────────────────────────────────────────────────────

/** 📖 Default location of the benchmark catalog JSON, resolved at runtime. */
const DATA_FILENAME = 'benchmarks.json'

/** 📖 Canonical list of extended fields overlaid onto a model. Used for the detail view. */
export const EXTENDED_BENCH_FIELDS = [
  'codingIndex', 'mathIndex', 'agenticIndex', 'reasoningIndex',
  'mmluPro', 'gpqa', 'hle',
  'contextWindow', 'supportsReasoning', 'supportsVision',
  'lastUpdated', 'originalModel',
]

// ─── Module-level state ──────────────────────────────────────────────────────

/** 📖 Cached parsed catalog (object). Loaded lazily on first access. */
let _catalog = null

/** 📖 Cached prefix index, lazily built from the catalog. */
let _index = null

/** 📖 Resolved path the catalog was last loaded from (for debug / hot-reload). */
let _catalogPath = null

// ─── Path resolution ──────────────────────────────────────────────────────────

/**
 * 📖 Resolves the absolute path to `src/data/benchmarks.json`. Works regardless of
 * 📖 CWD (the file is resolved relative to this module's location, not the user's cwd).
 *
 * @returns {string} Absolute path to benchmarks.json
 */
export function getBenchmarksDataPath() {
  const here = path.dirname(fileURLToPath(import.meta.url))
  return path.join(here, '..', 'data', DATA_FILENAME)
}

// ─── Lazy catalog load ───────────────────────────────────────────────────────

/**
 * 📖 Force-load the catalog from disk and return the parsed object. Safe to call
 * 📖 repeatedly — the second+ calls return the cached object. Corrupt JSON or
 * 📖 missing file yield an empty catalog (logged to stderr) — never throw, because
 * 📖 the TUI must keep rendering even if the catalog is missing.
 *
 * @returns {object} The catalog object keyed by modelId (with a `_meta` key mixed in)
 */
export function loadCatalog() {
  if (_catalog) return _catalog
  const target = getBenchmarksDataPath()
  try {
    const raw = fs.readFileSync(target, 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      _catalog = parsed
      _catalogPath = target
      return _catalog
    }
  } catch (err) {
    // 📖 File missing or corrupt — log once and fall back to empty catalog.
    // 📖 We intentionally don't throw: the TUI must keep working with sources.js data.
    if (process.env.FCM_BENCH_DEBUG) {
      console.warn(`[extended-benchmarks] failed to load ${target}: ${err.message}`)
    }
  }
  _catalog = {}
  _catalogPath = target
  return _catalog
}

/**
 * 📖 Reset the module cache. Used by tests + by the update script after a refresh.
 * 📖 Production code should not need to call this — the catalog is append-mostly.
 */
export function resetCatalogCache() {
  _catalog = null
  _index = null
  _catalogPath = null
}

/**
 * 📖 Lazy proxy: defer `readFileSync` until the first property access. This shaves
 * 📖 startup time (the JSON is ~16KB and grows as the catalog expands). Mirrors
 * 📖 pi-free's `hardcoded-benchmarks.ts` pattern.
 *
 * 📖 IMPORTANT: Property access triggers `load()`. Iteration (`Object.keys`,
 * 📖 `Reflect.ownKeys`, `for..in`) also triggers the load via the traps.
 */
export const BENCHMARKS = new Proxy({}, {
  get(_t, prop, receiver) {
    if (prop === Symbol.toPrimitive || prop === 'toJSON') return undefined
    if (prop === 'then') return undefined  // makes the proxy non-thenable
    const data = loadCatalog()
    return Reflect.get(data, prop, receiver)
  },
  has(_t, prop) {
    const data = loadCatalog()
    return Reflect.has(data, prop)
  },
  ownKeys() {
    const data = loadCatalog()
    return Reflect.ownKeys(data)
  },
  getOwnPropertyDescriptor(_t, p) {
    const data = loadCatalog()
    return Reflect.getOwnPropertyDescriptor(data, p)
  },
  set(_t, prop, value) {
    const data = loadCatalog()
    return Reflect.set(data, prop, value)
  },
  deleteProperty(_t, prop) {
    const data = loadCatalog()
    return Reflect.deleteProperty(data, prop)
  },
})

/**
 * 📖 Direct accessor (no Proxy) for code that wants the raw object, e.g. the
 * 📖 web dashboard backend iterating keys, or tests inspecting `_meta`.
 */
export function getCatalog() {
  return loadCatalog()
}

// ─── Prefix index ─────────────────────────────────────────────────────────────

/**
 * 📖 Build a prefix index over the catalog so a lookup is O(key length) instead
 * 📖 of O(catalog size). For each model id, every `-`-separated prefix maps to
 * 📖 the entries that start with that prefix.
 *
 * 📖 Example (preserves the original `-`/`/` separator at each level):
 * 📖   "deepseek-ai/deepseek-v4-pro" → prefixes:
 * 📖     "deepseek-ai"
 * 📖     "deepseek-ai/deepseek"          ← keeps the `/` from the source
 * 📖     "deepseek-ai/deepseek-v4"
 * 📖     "deepseek-ai/deepseek-v4-pro"   (exact)
 *
 * 📖 When a model id like "deepseek-ai/deepseek-v4-pro" is looked up, we try:
 * 📖   1. exact match → fast hit
 * 📖   2. longest-to-shortest prefix walk → best-effort match for cross-provider
 * 📖      variants ("z-ai/glm-5.2" vs "zai-glm-4.7" etc.)
 *
 * @param {object} [catalog] — Defaults to the lazy-loaded catalog. Tests inject a fixture.
 * @returns {{ exact: Map<string, object>, variants: Map<string, Array<[string, object]>> }}
 */
export function buildPrefixIndex(catalog) {
  const data = catalog ?? loadCatalog()
  const exact = new Map()
  const variants = new Map()
  for (const [key, value] of Object.entries(data)) {
    if (key === '_meta') continue  // 📖 metadata key, not a model entry
    if (!value || typeof value !== 'object') continue
    exact.set(key, value)
    // 📖 Walk the original string char-by-char to preserve both `-` and `/`
    // 📖 separators. A prefix ends right after each separator in the source.
    // 📖 This way "deepseek-ai/deepseek-v4-pro" produces:
    // 📖   "deepseek-ai", "deepseek-ai/deepseek", "deepseek-ai/deepseek-v4", ...
    // 📖 and "z-ai/glm-5.2" produces:
    // 📖   "z-ai", "z-ai/glm", "z-ai/glm-5", "z-ai/glm-5.2"
    const indices = []
    for (let i = 0; i < key.length; i++) {
      const ch = key[i]
      if (ch === '-' || ch === '/') indices.push(i)
    }
    for (const sepIdx of indices) {
      const prefix = key.slice(0, sepIdx)
      if (!prefix) continue
      const arr = variants.get(prefix) ?? []
      arr.push([key, value])
      variants.set(prefix, arr)
    }
  }
  return { exact, variants }
}

/**
 * 📖 Get the prefix index, building it on first call. Cached so repeated lookups
 * 📖 (every TUI render) are free.
 */
function getIndex() {
  if (_index) return _index
  _index = buildPrefixIndex(loadCatalog())
  return _index
}

/**
 * 📖 Score how good a candidate entry is for the requested model id. Higher = better.
 * 📖 Tie-breakers are used when multiple candidates share the same longest prefix
 * 📖 (e.g. "deepseek-ai/deepseek-v4-pro" exact vs. "deepseek-ai/deepseek-v4-flash" fallback).
 */
function scoreCandidate(requestedId, candidateKey) {
  if (requestedId === candidateKey) return 10_000  // exact match always wins
  // 📖 Prefer entries that share more characters with the requested id
  let commonPrefixLen = 0
  const min = Math.min(requestedId.length, candidateKey.length)
  while (commonPrefixLen < min && requestedId[commonPrefixLen] === candidateKey[commonPrefixLen]) {
    commonPrefixLen++
  }
  return commonPrefixLen
}

/**
 * 📖 Look up a model's extended benchmark entry. Tries in order:
 * 📖   1. exact match (O(1) Map lookup)
 * 📖   2. longest-prefix walk — picks the highest-scoring candidate
 * 📖   3. returns null (no throw)
 *
 * 📖 Performance: O(key length) since each prefix walk visits at most N candidates
 * 📖 where N is the number of entries sharing the current prefix (typically 1–3).
 *
 * @param {string} modelId
 * @param {object} [opts]
 * @param {object} [opts.catalog] — Override the catalog (tests)
 * @param {object} [opts.index]   — Override the prefix index (tests)
 * @returns {object|null} The extended benchmark entry, or null if not found.
 */
export function lookupExtendedBenchmark(modelId, opts = {}) {
  if (!modelId || typeof modelId !== 'string') return null
  let index = opts.index
  let catalog = opts.catalog
  if (!index) {
    if (catalog) {
      index = buildPrefixIndex(catalog)
    } else {
      index = getIndex()
    }
  }
  const { exact, variants } = index

  // Rule 1: exact match
  if (exact.has(modelId)) return exact.get(modelId)

  // Rule 2: longest-prefix walk. Walk separators in reverse, slicing the original string.
  const sepIndices = []
  for (let i = 0; i < modelId.length; i++) {
    if (modelId[i] === '-' || modelId[i] === '/') sepIndices.push(i)
  }
  for (let i = sepIndices.length - 1; i >= 0; i--) {
    const prefix = modelId.slice(0, sepIndices[i])
    if (!prefix) continue
    const candidates = variants.get(prefix)
    if (candidates && candidates.length > 0) {
      if (candidates.length === 1) return candidates[0][1]
      // 📖 Multiple candidates — pick the best-scoring one.
      let best = null
      let bestScore = -1
      for (const [key, value] of candidates) {
        const score = scoreCandidate(modelId, key)
        if (score > bestScore) {
          bestScore = score
          best = value
        }
      }
      return best
    }
  }
  return null
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * 📖 Aggregate stats over the catalog — used by the TUI footer chip and the
 * 📖 web dashboard's "Catalog" panel.
 *
 * @returns {{
 *   total: number,         // number of model entries (excluding _meta)
 *   lastUpdated: string,   // from _meta.lastUpdated
 *   source: string,        // from _meta.source
 *   byField: Record<string, number>  // count of entries with each field non-null
 * }}
 */
export function getCatalogStats() {
  const data = loadCatalog()
  const meta = data._meta ?? {}
  const byField = Object.fromEntries(EXTENDED_BENCH_FIELDS.map(f => [f, 0]))
  let total = 0
  for (const [key, value] of Object.entries(data)) {
    if (key === '_meta') continue
    if (!value || typeof value !== 'object') continue
    total++
    for (const field of EXTENDED_BENCH_FIELDS) {
      if (value[field] !== null && value[field] !== undefined) byField[field]++
    }
  }
  return {
    total,
    lastUpdated: meta.lastUpdated ?? 'unknown',
    source: meta.source ?? 'unknown',
    byField,
  }
}

// ─── Overlay helper ───────────────────────────────────────────────────────────

/**
 * 📖 Overlay an extended-benchmark entry onto a model/result object. The function
 * 📖 is non-mutating by default — returns a new object. If `mutate` is true, the
 * 📖 input is mutated in place (faster for hot paths).
 *
 * 📖 The overlay only adds fields the entry has. `sweScore` (curated, from
 * 📖 sources.js) is always preserved — extended metrics are additive.
 *
 * @param {object} model — The result or merged-model object to overlay onto
 * @param {object|null} entry — The extended-benchmark entry (or null = no-op)
 * @param {object} [opts]
 * @param {boolean} [opts.mutate=false] — Mutate `model` in place
 * @returns {object} The same model (mutated or new) with `extendedBench` field added
 */
export function mergeExtendedBenchmark(model, entry, opts = {}) {
  if (!model || typeof model !== 'object') return model
  if (!entry || typeof entry !== 'object') {
    // 📖 Still mark "looked up, nothing found" so the UI can show a "no data" badge
    if (!opts.mutate) return { ...model, extendedBench: null }
    model.extendedBench = null
    return model
  }
  // 📖 Build the overlay bag — only the fields present in the entry
  const overlay = {
    codingIndex:    entry.codingIndex    ?? null,
    mathIndex:      entry.mathIndex      ?? null,
    agenticIndex:   entry.agenticIndex   ?? null,
    reasoningIndex: entry.reasoningIndex ?? null,
    mmluPro:        entry.mmluPro        ?? null,
    gpqa:           entry.gpqa           ?? null,
    hle:            entry.hle            ?? null,
    contextWindow:  entry.contextWindow  ?? null,
    supportsReasoning: entry.supportsReasoning === true,
    supportsVision:    entry.supportsVision    === true,
    lastUpdated:    entry.lastUpdated    ?? null,
    originalModel:  entry.originalModel  ?? null,
  }
  if (opts.mutate) {
    model.extendedBench = overlay
    model.metaSourceExt = 'benchmarks.json'
    return model
  }
  return { ...model, extendedBench: overlay, metaSourceExt: 'benchmarks.json' }
}

// ─── Convenience: a "lookup + merge" combo ────────────────────────────────────

/**
 * 📖 One-shot helper: look up the model id, return a new object with `extendedBench`
 * 📖 set. Returns the model unchanged if no entry is found (so callers can blindly
 * 📖 call it on every model in a loop).
 *
 * @param {object} model — Object with at least `modelId`
 * @returns {object} Same model + `extendedBench` (may be null)
 */
export function enrichWithExtendedBenchmark(model) {
  if (!model || !model.modelId) return model
  const entry = lookupExtendedBenchmark(model.modelId)
  return mergeExtendedBenchmark(model, entry)
}
