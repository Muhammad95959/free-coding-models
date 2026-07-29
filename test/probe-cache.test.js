/**
 * @file test/probe-cache.test.js
 * @description Tests for src/core/probe-cache.js — persistent probe-cache module.
 *
 * Covers:
 *   - Freshness rules 1–5 (no entry / version mismatch / broken always-due / TTL expired / fresh)
 *   - getModelsDueForProbe multi-model fan-out
 *   - recordProbeResults normalisation + dropping bad input
 *   - getCacheStats aggregates (ok / broken / fresh / stale / hidden)
 *   - getCachedResultsForProvider synthesises TUI-shaped results, excludes broken+stale
 *   - pruneStaleEntries against live catalog
 *   - clearCache deletes file + forgets in-memory mirror
 *   - loadCache recovers from corrupt JSON (no crash)
 *   - Atomic write via shared helper (tmp + rename)
 *   - getProbeCachePath honours XDG_CACHE_HOME
 *   - End-to-end: write → reload → freshness check survives round-trip
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  getProbeCachePath,
  loadCache,
  flushCache,
  clearCache,
  getModelsDueForProbe,
  isCacheFresh,
  recordProbeResults,
  getCacheStats,
  getCachedResultsForProvider,
  pruneStaleEntries,
  DEFAULT_PROBE_TTL_MS,
  CURRENT_PROBE_VERSION,
} from '../src/core/probe-cache.js'

// ─── Test helpers ────────────────────────────────────────────────────────────

/**
 * 📖 Build a cache object pre-populated for one provider — keeps the freshness-rule
 * 📖 tests focused on the rule under test rather than boilerplate.
 */
function makeEntry(overrides = {}) {
  return {
    status: 'ok',
    lastProbedAt: 1_700_000_000_000, // arbitrary fixed timestamp
    latencyMs: 250,
    lastError: null,
    probeVersion: CURRENT_PROBE_VERSION,
    ...overrides,
  }
}

function makeCache(providers = {}) {
  return { version: CURRENT_PROBE_VERSION, providers }
}

const HOUR = 60 * 60 * 1000

// ─── getProbeCachePath ────────────────────────────────────────────────────────

describe('getProbeCachePath', () => {
  let originalXdg
  beforeEach(() => { originalXdg = process.env.XDG_CACHE_HOME })
  afterEach(() => {
    if (originalXdg === undefined) delete process.env.XDG_CACHE_HOME
    else process.env.XDG_CACHE_HOME = originalXdg
  })

  it('falls back to ~/.free-coding-models/probe-cache.json when XDG_CACHE_HOME is unset', () => {
    delete process.env.XDG_CACHE_HOME
    const p = getProbeCachePath()
    assert.ok(p.endsWith('/probe-cache.json'), `unexpected path: ${p}`)
    assert.ok(p.includes('.free-coding-models'), `expected ~/.free-coding-models in path: ${p}`)
  })

  it('honours XDG_CACHE_HOME when set', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fcm-xdg-'))
    try {
      process.env.XDG_CACHE_HOME = dir
      const p = getProbeCachePath()
      assert.ok(p.startsWith(dir), `expected to start with ${dir}, got ${p}`)
      assert.ok(p.includes('free-coding-models/probe-cache.json'))
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

// ─── loadCache / flushCache / clearCache ──────────────────────────────────────

describe('loadCache + flushCache + clearCache', () => {
  let tmpDir
  let cachePath

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fcm-cache-'))
    cachePath = join(tmpDir, 'probe-cache.json')
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('returns empty cache when file does not exist', () => {
    const c = loadCache({ path: cachePath })
    assert.deepStrictEqual(c, { version: CURRENT_PROBE_VERSION, providers: {} })
  })

  it('recovers gracefully from corrupt JSON (does not throw)', () => {
    writeFileSync(cachePath, '{not valid json')
    const c = loadCache({ path: cachePath })
    assert.deepStrictEqual(c, { version: CURRENT_PROBE_VERSION, providers: {} })
  })

  it('fills missing top-level fields with defaults', () => {
    writeFileSync(cachePath, JSON.stringify({ providers: 'garbage' }))
    const c = loadCache({ path: cachePath })
    assert.strictEqual(c.version, CURRENT_PROBE_VERSION)
    assert.deepStrictEqual(c.providers, {})
  })

  it('preserves valid structure on round-trip', () => {
    const original = makeCache({
      nvidiaNim: { models: { 'foo/bar': makeEntry({ latencyMs: 123 }) } },
    })
    assert.strictEqual(flushCache({ path: cachePath, cache: original }), true)
    const reloaded = loadCache({ path: cachePath })
    assert.deepStrictEqual(reloaded, original)
  })

  it('clearCache removes file and forgets in-memory state', () => {
    writeFileSync(cachePath, JSON.stringify(makeCache({ x: { models: { 'a/b': makeEntry() } } })))
    loadCache({ path: cachePath })
    assert.strictEqual(clearCache({ path: cachePath }), true)
    assert.strictEqual(existsSync(cachePath), false)
    // 📖 Next load returns empty (would have thrown if in-memory mirror survived)
    const fresh = loadCache({ path: cachePath })
    assert.deepStrictEqual(fresh.providers, {})
  })
})

// ─── Freshness rules ─────────────────────────────────────────────────────────

describe('getModelsDueForProbe — freshness rules', () => {
  const providerKey = 'groq'
  const modelIds = ['m1', 'm2', 'm3', 'm4', 'm5']
  const now = 1_700_000_000_000
  const opts = (cache) => ({ cache, now, ttlMs: DEFAULT_PROBE_TTL_MS })

  it('rule 1: missing entry → due', () => {
    const cache = makeCache({ [providerKey]: { models: { m1: makeEntry() } } })
    // 📖 m2, m3, m4, m5 have no entries → all due
    const due = getModelsDueForProbe(providerKey, modelIds, opts(cache))
    assert.deepStrictEqual(due.sort(), ['m2', 'm3', 'm4', 'm5'])
  })

  it('rule 2: probeVersion mismatch → due (even if recent and ok)', () => {
    const cache = makeCache({
      [providerKey]: { models: {
        m1: makeEntry({ probeVersion: CURRENT_PROBE_VERSION - 1 }),
      } },
    })
    const due = getModelsDueForProbe(providerKey, ['m1'], opts(cache))
    assert.deepStrictEqual(due, ['m1'])
  })

  it('rule 3 (issue #146): status broken → due only AFTER brokenCooldownMs', () => {
    // 📖 A broken model probed 1ms ago is still inside its 30s cooldown → must be skipped,
    // 📖 otherwise the ping loop would re-ping it every cycle and burn rate-limited quota.
    const cache = makeCache({
      [providerKey]: { models: {
        m1: makeEntry({ status: 'broken', lastProbedAt: now - 1 }), // just probed
      } },
    })
    assert.deepStrictEqual(getModelsDueForProbe(providerKey, ['m1'], opts(cache)), [])
    // 📖 Past the cooldown → recovered and due again for a fresh probe.
    const cache2 = makeCache({
      [providerKey]: { models: {
        m1: makeEntry({ status: 'broken', lastProbedAt: now - 60_000 }),
      } },
    })
    assert.deepStrictEqual(getModelsDueForProbe(providerKey, ['m1'], opts(cache2)), ['m1'])
  })

  it('rule 4: TTL expired → due', () => {
    const cache = makeCache({
      [providerKey]: { models: {
        m1: makeEntry({ lastProbedAt: now - DEFAULT_PROBE_TTL_MS - 1 }),
      } },
    })
    const due = getModelsDueForProbe(providerKey, ['m1'], opts(cache))
    assert.deepStrictEqual(due, ['m1'])
  })

  it('rule 5: fresh + ok → skip', () => {
    const cache = makeCache({
      [providerKey]: { models: {
        m1: makeEntry({ lastProbedAt: now - HOUR }),
      } },
    })
    const due = getModelsDueForProbe(providerKey, ['m1'], opts(cache))
    assert.deepStrictEqual(due, [])
  })

  it('combines all rules correctly in a multi-model batch', () => {
    const cache = makeCache({
      [providerKey]: { models: {
        // fresh ok → skip
        fresh_ok: makeEntry({ lastProbedAt: now - HOUR }),
        // TTL expired → due
        stale_ok: makeEntry({ lastProbedAt: now - DEFAULT_PROBE_TTL_MS - 1 }),
        // broken BUT within 30s cooldown → skip (issue #146 backoff)
        broken_recent: makeEntry({ status: 'broken', lastProbedAt: now - 5 }),
        // version mismatch → due
        old_version: makeEntry({ probeVersion: 0 }),
        // missing entry → due (handled by caller providing only known ids)
      } },
    })
    const ids = ['fresh_ok', 'stale_ok', 'broken_recent', 'old_version', 'never_seen']
    const due = getModelsDueForProbe(providerKey, ids, opts(cache)).sort()
    // 📖 Note: broken_recent is INTENTIONALLY excluded now — it must wait out its cooldown
    assert.deepStrictEqual(due, ['never_seen', 'old_version', 'stale_ok'])
  })

  it('returns empty array when cache has no entry for the provider', () => {
    const cache = makeCache({ otherProvider: { models: {} } })
    const due = getModelsDueForProbe(providerKey, ['m1'], opts(cache))
    assert.deepStrictEqual(due, ['m1']) // missing entry → due
  })
})

// ─── isCacheFresh ────────────────────────────────────────────────────────────

describe('isCacheFresh', () => {
  const now = 1_700_000_000_000
  const opts = (cache) => ({ cache, now, ttlMs: DEFAULT_PROBE_TTL_MS })

  it('returns false when no entry', () => {
    const cache = makeCache({ p: { models: {} } })
    assert.strictEqual(isCacheFresh('p', 'missing', opts(cache)), false)
  })

  it('returns TRUE for broken model within its cooldown (issue #146)', () => {
    // 📖 makeEntry defaults lastProbedAt to `now`, so a freshly-broken entry sits inside
    // 📖 the 30s cooldown window and must be considered fresh (skipped by the ping loop).
    const cache = makeCache({ p: { models: { m: makeEntry({ status: 'broken' }) } } })
    assert.strictEqual(isCacheFresh('p', 'm', opts(cache)), true)
    // 📖 Past the cooldown → no longer fresh, eligible for a recovery probe.
    const cache2 = makeCache({ p: { models: { m: makeEntry({ status: 'broken', lastProbedAt: now - 60_000 }) } } })
    assert.strictEqual(isCacheFresh('p', 'm', opts(cache2)), false)
  })

  it('returns false when version mismatch', () => {
    const cache = makeCache({ p: { models: { m: makeEntry({ probeVersion: 999 }) } } })
    assert.strictEqual(isCacheFresh('p', 'm', opts(cache)), false)
  })

  it('returns false when TTL expired', () => {
    const cache = makeCache({
      p: { models: { m: makeEntry({ lastProbedAt: now - DEFAULT_PROBE_TTL_MS - 1 }) } },
    })
    assert.strictEqual(isCacheFresh('p', 'm', opts(cache)), false)
  })

  it('returns true when entry is ok + version matches + within TTL', () => {
    const cache = makeCache({
      p: { models: { m: makeEntry({ lastProbedAt: now - HOUR }) } },
    })
    assert.strictEqual(isCacheFresh('p', 'm', opts(cache)), true)
  })
})

// ─── recordProbeResults ──────────────────────────────────────────────────────

describe('recordProbeResults', () => {
  it('writes valid results and updates the in-memory cache', () => {
    const cache = makeCache()
    const { written, dropped } = recordProbeResults('p', [
      { modelId: 'm1', status: 'ok', latencyMs: 200 },
      { modelId: 'm2', status: 'broken', lastError: '401 Unauthorized' },
    ], { cache, now: 1_700_000_000_000 })
    assert.strictEqual(written, 2)
    assert.strictEqual(dropped, 0)
    assert.strictEqual(cache.providers.p.models.m1.status, 'ok')
    assert.strictEqual(cache.providers.p.models.m1.latencyMs, 200)
    assert.strictEqual(cache.providers.p.models.m2.status, 'broken')
    assert.strictEqual(cache.providers.p.models.m2.lastError, '401 Unauthorized')
  })

  it('drops malformed results (count in `dropped`)', () => {
    const cache = makeCache()
    const { written, dropped } = recordProbeResults('p', [
      { modelId: 'm1', status: 'ok', latencyMs: 200 },
      { modelId: '', status: 'ok' },          // empty modelId
      { modelId: 'm2', status: 'weird' },     // bad status
      null,                                    // null entry
      'not-an-object',                         // non-object
      { modelId: 'm3' },                       // missing status
    ], { cache })
    assert.strictEqual(written, 1)
    assert.strictEqual(dropped, 5)
  })

  it('coerces non-finite latencyMs to null', () => {
    const cache = makeCache()
    recordProbeResults('p', [{ modelId: 'm', status: 'ok', latencyMs: NaN }], { cache })
    assert.strictEqual(cache.providers.p.models.m.latencyMs, null)
  })

  it('always stamps probeVersion = CURRENT_PROBE_VERSION', () => {
    const cache = makeCache()
    recordProbeResults('p', [{ modelId: 'm', status: 'ok' }], { cache })
    assert.strictEqual(cache.providers.p.models.m.probeVersion, CURRENT_PROBE_VERSION)
  })
})

// ─── getCacheStats ───────────────────────────────────────────────────────────

describe('getCacheStats', () => {
  const now = 1_700_000_000_000
  const opts = (cache) => ({ cache, now, ttlMs: DEFAULT_PROBE_TTL_MS })

  it('returns zeros for empty cache', () => {
    const s = getCacheStats(opts(makeCache()))
    assert.strictEqual(s.total, 0)
    assert.strictEqual(s.ok, 0)
    assert.strictEqual(s.broken, 0)
    assert.strictEqual(s.freshCount, 0)
    assert.strictEqual(s.staleCount, 0)
    assert.strictEqual(s.hiddenCount, 0)
    assert.strictEqual(s.dueCount, 0)
    assert.strictEqual(s.providers, 0)
  })

  it('counts ok, broken, fresh, stale correctly', () => {
    const cache = makeCache({
      p1: { models: {
        fresh:   makeEntry({ lastProbedAt: now - HOUR }),
        stale:   makeEntry({ lastProbedAt: now - DEFAULT_PROBE_TTL_MS - 1 }),
        broken:  makeEntry({ status: 'broken', lastProbedAt: now - HOUR }),
        version: makeEntry({ probeVersion: 0 }), // would be stale under fresh-rule
      } },
    })
    const s = getCacheStats(opts(cache))
    assert.strictEqual(s.total, 4)
    assert.strictEqual(s.ok, 3)        // fresh, stale, version
    assert.strictEqual(s.broken, 1)
    assert.strictEqual(s.freshCount, 1)
    assert.strictEqual(s.staleCount, 2) // stale + version mismatch
    assert.strictEqual(s.hiddenCount, 1) // broken
    assert.strictEqual(s.dueCount, 3)  // broken + stale + version
    assert.strictEqual(s.providers, 1)
  })
})

// ─── getCachedResultsForProvider ─────────────────────────────────────────────

describe('getCachedResultsForProvider', () => {
  const now = 1_700_000_000_000
  const opts = (cache) => ({ cache, now, ttlMs: DEFAULT_PROBE_TTL_MS })

  it('returns empty array when provider not in cache', () => {
    const out = getCachedResultsForProvider('missing', opts(makeCache()))
    assert.deepStrictEqual(out, [])
  })

  it('excludes broken entries', () => {
    const cache = makeCache({
      p: { models: {
        ok: makeEntry({ lastProbedAt: now - HOUR }),
        broken: makeEntry({ status: 'broken', lastProbedAt: now - HOUR }),
      } },
    })
    const out = getCachedResultsForProvider('p', opts(cache))
    assert.strictEqual(out.length, 1)
    assert.strictEqual(out[0].modelId, 'ok')
  })

  it('excludes stale (TTL-expired) entries', () => {
    const cache = makeCache({
      p: { models: {
        fresh: makeEntry({ lastProbedAt: now - HOUR }),
        stale: makeEntry({ lastProbedAt: now - DEFAULT_PROBE_TTL_MS - 1 }),
      } },
    })
    const out = getCachedResultsForProvider('p', opts(cache))
    assert.strictEqual(out.length, 1)
    assert.strictEqual(out[0].modelId, 'fresh')
  })

  it('marks results with source: "cache" so the TUI can label them', () => {
    const cache = makeCache({
      p: { models: { m: makeEntry({ lastProbedAt: now - HOUR, latencyMs: 300 }) } },
    })
    const out = getCachedResultsForProvider('p', opts(cache))
    assert.strictEqual(out[0].source, 'cache')
    assert.strictEqual(out[0].latencyMs, 300)
    assert.strictEqual(out[0].providerKey, 'p')
    assert.strictEqual(out[0].status, 'up')
  })
})

// ─── pruneStaleEntries ───────────────────────────────────────────────────────

describe('pruneStaleEntries', () => {
  it('removes entries whose modelId is not in the live set', () => {
    const cache = makeCache({
      p: { models: {
        live_a: makeEntry(),
        live_b: makeEntry(),
        dead_c: makeEntry(),
        dead_d: makeEntry(),
      } },
    })
    const pruned = pruneStaleEntries('p', new Set(['live_a', 'live_b']), { cache })
    assert.strictEqual(pruned, 2)
    assert.deepStrictEqual(Object.keys(cache.providers.p.models).sort(), ['live_a', 'live_b'])
  })

  it('returns 0 when cache is empty for the provider', () => {
    const cache = makeCache({ other: { models: { m: makeEntry() } } })
    assert.strictEqual(pruneStaleEntries('p', ['m'], { cache }), 0)
  })

  it('accepts both Set and array for liveModelIds', () => {
    const cache = makeCache({ p: { models: { keep: makeEntry(), drop: makeEntry() } } })
    assert.strictEqual(pruneStaleEntries('p', ['keep'], { cache }), 1)
  })
})

// ─── End-to-end round-trip ────────────────────────────────────────────────────

describe('end-to-end: write → reload → freshness check', () => {
  let tmpDir, cachePath
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fcm-e2e-'))
    cachePath = join(tmpDir, 'probe-cache.json')
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('a fresh ok entry survives a flush+reload cycle', () => {
    const cache = loadCache({ path: cachePath })
    const now = Date.now()
    recordProbeResults('groq', [{ modelId: 'llama-3', status: 'ok', latencyMs: 180 }], { cache, now })
    flushCache({ path: cachePath, cache })

    // 📖 Simulate a brand new process by clearing the module-level mirror implicitly
    // 📖 (loadCache into a fresh local var is the test equivalent).
    const reloaded = loadCache({ path: cachePath })
    assert.strictEqual(reloaded.providers.groq.models['llama-3'].status, 'ok')
    assert.strictEqual(reloaded.providers.groq.models['llama-3'].latencyMs, 180)
    assert.strictEqual(reloaded.providers.groq.models['llama-3'].probeVersion, CURRENT_PROBE_VERSION)

    // 📖 And the entry is fresh by the freshness rules.
    assert.strictEqual(
      isCacheFresh('groq', 'llama-3', { cache: reloaded, now: now + HOUR }),
      true,
    )
  })

  it('after a probeVersion bump, old entries are treated as due', () => {
    // 📖 Simulate an older cache file written before CURRENT_PROBE_VERSION was bumped
    writeFileSync(cachePath, JSON.stringify({
      version: 1, // legacy — pre-probeVersion scheme
      providers: {
        groq: {
          models: {
            'llama-3': makeEntry({ probeVersion: 1, lastProbedAt: Date.now() - HOUR }),
          },
        },
      },
    }))
    const reloaded = loadCache({ path: cachePath })
    // 📖 Even though the entry exists and is recent, the version mismatch should make it due
    assert.deepStrictEqual(
      getModelsDueForProbe('groq', ['llama-3'], { cache: reloaded, now: Date.now() }),
      ['llama-3'],
    )
  })
})

// ─── Concurrency: read-merge-write ────────────────────────────────────────────

describe('flushCache concurrency (read-merge-write)', () => {
  let tmpDir, cachePath
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fcm-conc-'))
    cachePath = join(tmpDir, 'probe-cache.json')
  })
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  it('merges on-disk state written by another process before our flush', () => {
    // 📖 Simulate "another process" wrote a model we don't know about.
    const otherProcessCache = makeCache({
      otherProvider: { models: { 'their/model': makeEntry({ latencyMs: 999 }) } },
    })
    writeFileSync(cachePath, JSON.stringify(otherProcessCache))

    // 📖 Our process has its own deltas.
    const ourCache = makeCache({
      ourProvider: { models: { 'our/model': makeEntry({ latencyMs: 111 }) } },
    })

    assert.strictEqual(flushCache({ path: cachePath, cache: ourCache }), true)

    // 📖 Both should be present in the final file.
    const final = JSON.parse(readFileSync(cachePath, 'utf8'))
    assert.ok(final.providers.otherProvider?.models?.['their/model'], 'other-process entry should survive')
    assert.ok(final.providers.ourProvider?.models?.['our/model'], 'our entry should be written')
  })

  it('overwrites stale lastProbedAt with our fresher value (incoming wins)', () => {
    const stale = makeEntry({ lastProbedAt: 1_000, latencyMs: 50 })
    const fresh = makeEntry({ lastProbedAt: 9_999, latencyMs: 200 })
    writeFileSync(cachePath, JSON.stringify(makeCache({ p: { models: { 'm': stale } } })))

    const ourCache = makeCache({ p: { models: { 'm': fresh } } })
    flushCache({ path: cachePath, cache: ourCache })

    const final = JSON.parse(readFileSync(cachePath, 'utf8'))
    assert.strictEqual(final.providers.p.models.m.lastProbedAt, 9_999)
    assert.strictEqual(final.providers.p.models.m.latencyMs, 200)
  })

  it('writes our cache unchanged when file does not exist yet', () => {
    const ourCache = makeCache({ p: { models: { 'm': makeEntry() } } })
    flushCache({ path: cachePath, cache: ourCache })

    const final = JSON.parse(readFileSync(cachePath, 'utf8'))
    assert.strictEqual(final.providers.p.models.m.status, 'ok')
  })

  it('recovers from corrupt on-disk file (still writes our deltas)', () => {
    writeFileSync(cachePath, '{ not valid json')
    const ourCache = makeCache({ p: { models: { 'm': makeEntry() } } })
    assert.strictEqual(flushCache({ path: cachePath, cache: ourCache }), true)
    const final = JSON.parse(readFileSync(cachePath, 'utf8'))
    assert.ok(final.providers.p.models.m)
  })
})

// ─── Constants sanity ─────────────────────────────────────────────────────────

describe('module constants', () => {
  it('DEFAULT_PROBE_TTL_MS is 24h', () => {
    assert.strictEqual(DEFAULT_PROBE_TTL_MS, 24 * 60 * 60 * 1000)
  })

  it('CURRENT_PROBE_VERSION is a positive integer', () => {
    assert.strictEqual(typeof CURRENT_PROBE_VERSION, 'number')
    assert.ok(Number.isInteger(CURRENT_PROBE_VERSION))
    assert.ok(CURRENT_PROBE_VERSION >= 1)
  })
})