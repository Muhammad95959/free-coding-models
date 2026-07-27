/**
 * @file models-dev-fetcher.js
 * @description Fetcher + TTL cache for the models.dev community catalog, with retry/backoff.
 *              Used by src/core/models-dev-index.js to enrich `sources.js` with live metadata
 *              (context window, max output tokens, reasoning/vision/thinking support).
 *
 * @details
 *   📖 Why this exists:
 *   📖 - `sources.js` is curated (which models to ping, SWE-bench tier) but its `ctx` field
 *   📖   drifts — vendors expand windows (128k → 256k → 1M) and we don't catch up.
 *   📖 - models.dev is a community-maintained registry of LLM metadata (context, max
 *   📖   tokens, reasoning/vision flags, thinking levels) that we can use as an overlay.
 *   📖 - The fetch happens lazily and non-blocking — if the network is down or the
 *   📖   catalog is unreachable, the TUI keeps rendering with sources.js values.
 *
 *   📖 Behaviour:
 *   📖 - 3 retries with 250 ms backoff, 8s per-request timeout.
 *   📖 - 5-min in-process cache (TTL).
 *   📖 - Sets a custom User-Agent so the maintainers can identify us.
 *   📖 - Returns null on failure (no throw). Callers MUST handle null gracefully.
 *
 *   📖 The fetched JSON shape (from models.dev):
 *   📖   {
 *   📖     "<providerKey>": {
 *   📖       "id": "deepseek",
 *   📖       "name": "DeepSeek",
 *   📖       "models": {
 *   📖         "<modelId>": {
 *   📖           "id": "deepseek-chat",
 *   📖           "name": "DeepSeek Chat",
 *   📖           "context": 128000,
 *   📖           "maxTokens": 8192,
 *   📖           "reasoning": false,
 *   📖           "vision": false,
 *   📖           "thinking": false,
 *   📖           "tool_call": true,
 *   📖           ...
 *   📖         }
 *   📖       }
 *   📖     }
 *   📖   }
 *
 * @functions
 *   → fetchModelsDevCatalog({ force }?)  — Returns the parsed catalog (or null on failure)
 *   → getModelsDevCacheStats()           — { hits, misses, lastFetchAt, lastError }
 *   → clearModelsDevCache()              — Reset the in-process cache (for tests + drift script)
 *   → _resetModelsDevCacheForTests()     — Alias used by tests (no behaviour difference)
 *
 * @exports fetchModelsDevCatalog, getModelsDevCacheStats, clearModelsDevCache,
 *          MODELS_DEV_URL, DEFAULT_FETCH_TIMEOUT_MS, MODELS_DEV_CACHE_TTL_MS
 *
 * @see src/core/models-dev-index.js — uses this fetcher to build the lookup index
 * @see src/core/models-drift.js     — drift detection against sources.js
 * @see https://models.dev           — community catalog source
 */

const MODELS_DEV_URL = 'https://models.dev/models.json'
const DEFAULT_FETCH_TIMEOUT_MS = 8_000
const MODELS_DEV_CACHE_TTL_MS = 5 * 60 * 1000  // 📖 5 minutes
const MODELS_DEV_RETRIES = 3
const MODELS_DEV_RETRY_DELAY_MS = 250
const USER_AGENT = 'free-coding-models (+https://github.com/vava-nessa/free-coding-models)'

// 📖 Re-export as ES exports so the test file (and other consumers) can import them.
// 📖 We re-declare them as named exports here to keep the file self-documenting.
export {
  MODELS_DEV_URL,
  DEFAULT_FETCH_TIMEOUT_MS,
  MODELS_DEV_CACHE_TTL_MS,
  MODELS_DEV_RETRIES,
  MODELS_DEV_RETRY_DELAY_MS,
  USER_AGENT,
}

// ─── Module-level state ──────────────────────────────────────────────────────

/** 📖 Cached entry: { expiresAt, promise, resolvedAt, error, hits, misses } */
let _cache = null

/** 📖 Simple sleep helper (used between retries). */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * 📖 Fetch (or return the cached) models.dev catalog. Returns the parsed JSON
 * 📖 object on success, or null on failure (after exhausting all retries).
 * 📖 Multiple concurrent calls share the same in-flight promise (no thundering herd).
 *
 * @param {object} [opts]
 * @param {boolean} [opts.force=false] — Bypass the cache and re-fetch
 * @param {number} [opts.timeoutMs=8000] — Per-request timeout
 * @param {number} [opts.retries=3] — Number of attempts before giving up
 * @param {number} [opts.retryDelayMs=250] — Backoff between attempts
 * @param {boolean} [opts.silent=true] — Suppress console.warn on fetch failure
 * @returns {Promise<object|null>}
 */
export async function fetchModelsDevCatalog({
  force = false,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
  retries = MODELS_DEV_RETRIES,
  retryDelayMs = MODELS_DEV_RETRY_DELAY_MS,
  silent = true,
} = {}) {
  const now = Date.now()
  if (!force && _cache && _cache.expiresAt > now && _cache.promise) {
    _cache.hits++
    return _cache.promise
  }
  if (_cache) _cache.misses++

  const promise = (async () => {
    let lastError = null
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), timeoutMs)
        try {
          const res = await fetch(MODELS_DEV_URL, {
            headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
            signal: ctrl.signal,
          })
          if (!res.ok) {
            lastError = new Error(`HTTP ${res.status} ${res.statusText}`.trim())
          } else {
            const data = await res.json()
            if (data && typeof data === 'object') {
              return data
            }
            lastError = new Error('models.dev returned non-object payload')
          }
        } finally {
          clearTimeout(timer)
        }
      } catch (err) {
        lastError = err
      }
      if (attempt < retries) {
        await sleep(retryDelayMs)
      }
    }
    if (!silent) {
      console.warn(`[models.dev] fetch failed after ${retries} attempts: ${lastError?.message ?? 'unknown error'}`)
    }
    if (_cache) {
      _cache.error = lastError?.message ?? 'unknown'
      _cache.resolvedAt = Date.now()
    }
    return null
  })()

  _cache = {
    expiresAt: Date.now() + MODELS_DEV_CACHE_TTL_MS,
    promise,
    resolvedAt: null,
    error: null,
    hits: _cache?.hits ?? 0,
    misses: _cache?.misses ?? 0,
  }

  // 📖 Wrap the promise so we can capture resolvedAt + error metadata on success too
  const wrapped = promise.then(data => {
    if (_cache) {
      _cache.resolvedAt = Date.now()
      _cache.error = null
    }
    return data
  })
  return wrapped
}

/**
 * 📖 Stats for the in-process cache. Used by the TUI footer chip and the
 * 📖 /health endpoint of the daemon.
 *
 * @returns {{
 *   hits: number,
 *   misses: number,
 *   lastFetchAt: number|null,    // ms timestamp of last completed fetch
 *   lastError: string|null,
 *   cached: boolean              // whether the current entry is still within TTL
 * }}
 */
export function getModelsDevCacheStats() {
  if (!_cache) {
    return { hits: 0, misses: 0, lastFetchAt: null, lastError: null, cached: false }
  }
  return {
    hits: _cache.hits,
    misses: _cache.misses,
    lastFetchAt: _cache.resolvedAt,
    lastError: _cache.error,
    cached: _cache.expiresAt > Date.now(),
  }
}

/**
 * 📖 Clear the in-process cache. The next call to fetchModelsDevCatalog will
 * 📖 re-fetch. Used by tests + the drift script (to get a fresh view).
 */
export function clearModelsDevCache() {
  _cache = null
}

/** 📖 Test-only alias. Same behaviour as clearModelsDevCache. */
export function _resetModelsDevCacheForTests() {
  clearModelsDevCache()
}
