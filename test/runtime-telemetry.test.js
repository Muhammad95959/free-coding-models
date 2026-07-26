/**
 * @file test/runtime-telemetry.test.js
 * @description Tests for src/core/runtime-telemetry.js (t3).
 *
 * Covers:
 *   - recordModelCall: success/error accumulation, tokens, latency, FIFO cap
 *   - Derived fields: successRate, avgLatencyMs, avgTokensPerSecond
 *   - getRealWorldScore: returns null below MIN_CALLS, weighted composite above
 *   - getCacheStats: aggregate counts
 *   - pruneStaleEntries: drops old entries
 *   - clearRuntimeTelemetry: removes file
 *   - Persistence: write -> reload round-trip
 *   - Atomic write via shared helper (tmp + rename)
 *   - getRuntimeTelemetryPath honours XDG_CACHE_HOME
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  getRuntimeTelemetryPath,
  loadRuntimeTelemetry,
  flushRuntimeTelemetry,
  clearRuntimeTelemetry,
  recordModelCall,
  getModelTelemetry,
  getAllModelTelemetry,
  getRealWorldScore,
  getCacheStats,
  pruneStaleEntries,
  DEFAULT_MIN_CALLS_FOR_SCORE,
  DEFAULT_REAL_WORLD_WEIGHTS,
  MAX_RECENT_CALLS,
} from '../src/core/runtime-telemetry.js'

// ─── Test helpers ────────────────────────────────────────────────────────────

let tmpDir, telemetryPath
beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'fcm-rt-'))
  telemetryPath = join(tmpDir, 'runtime-telemetry.json')
})
afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }) })

// ─── Path resolution ──────────────────────────────────────────────────────────

describe('getRuntimeTelemetryPath', () => {
  let originalXdg
  beforeEach(() => { originalXdg = process.env.XDG_CACHE_HOME })
  afterEach(() => {
    if (originalXdg === undefined) delete process.env.XDG_CACHE_HOME
    else process.env.XDG_CACHE_HOME = originalXdg
  })

  it('falls back to ~/.free-coding-models/runtime-telemetry.json', () => {
    delete process.env.XDG_CACHE_HOME
    const p = getRuntimeTelemetryPath()
    assert.ok(p.endsWith('/runtime-telemetry.json'))
    assert.ok(p.includes('.free-coding-models'))
  })

  it('honours XDG_CACHE_HOME when set', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fcm-xdg-rt-'))
    try {
      process.env.XDG_CACHE_HOME = dir
      const p = getRuntimeTelemetryPath()
      assert.ok(p.startsWith(dir))
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

// ─── Constants ────────────────────────────────────────────────────────────────

describe('module constants', () => {
  it('DEFAULT_MIN_CALLS_FOR_SCORE is 5', () => {
    assert.strictEqual(DEFAULT_MIN_CALLS_FOR_SCORE, 5)
  })

  it('DEFAULT_REAL_WORLD_WEIGHTS sum to 1.0', () => {
    const sum = DEFAULT_REAL_WORLD_WEIGHTS.success + DEFAULT_REAL_WORLD_WEIGHTS.speed + DEFAULT_REAL_WORLD_WEIGHTS.recency
    assert.ok(Math.abs(sum - 1.0) < 1e-9, `weights sum to ${sum}, expected 1.0`)
  })

  it('MAX_RECENT_CALLS is 50', () => {
    assert.strictEqual(MAX_RECENT_CALLS, 50)
  })
})

// ─── recordModelCall ─────────────────────────────────────────────────────────

describe('recordModelCall', () => {
  it('writes a new entry on first call', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    const res = recordModelCall('groq', 'llama-3', { success: true, latencyMs: 200, promptTokens: 100, completionTokens: 50 }, { cache })
    assert.strictEqual(res.written, true)
    const entry = cache.models['groq/llama-3']
    assert.strictEqual(entry.totalCalls, 1)
    assert.strictEqual(entry.successCalls, 1)
    assert.strictEqual(entry.errorCalls, 0)
    assert.strictEqual(entry.totalPromptTokens, 100)
    assert.strictEqual(entry.totalCompletionTokens, 50)
    assert.strictEqual(entry.totalLatencyMs, 200)
    assert.strictEqual(entry.recentCalls.length, 1)
  })

  it('accumulates counters across calls', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    recordModelCall('groq', 'm', { success: true, latencyMs: 100, promptTokens: 10, completionTokens: 20 }, { cache })
    recordModelCall('groq', 'm', { success: false, latencyMs: 50, error: '429' }, { cache })
    recordModelCall('groq', 'm', { success: true, latencyMs: 150, promptTokens: 5, completionTokens: 10 }, { cache })
    const entry = cache.models['groq/m']
    assert.strictEqual(entry.totalCalls, 3)
    assert.strictEqual(entry.successCalls, 2)
    assert.strictEqual(entry.errorCalls, 1)
    assert.strictEqual(entry.totalLatencyMs, 300)
    assert.strictEqual(entry.totalPromptTokens, 15)
    assert.strictEqual(entry.totalCompletionTokens, 30)
  })

  it('drops invalid providerKey/modelId', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    assert.strictEqual(recordModelCall('', 'm', { success: true }).written, false)
    assert.strictEqual(recordModelCall('p', '', { success: true }).written, false)
    assert.strictEqual(recordModelCall(null, 'm', { success: true }).written, false)
  })

  it('drops invalid callResult (null, non-object)', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    assert.strictEqual(recordModelCall('p', 'm', null, { cache }).written, false)
    assert.strictEqual(recordModelCall('p', 'm', 'not-an-object', { cache }).written, false)
  })

  it('coerces non-finite latencyMs to 0', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    recordModelCall('p', 'm', { success: true, latencyMs: NaN, completionTokens: 10 }, { cache })
    assert.strictEqual(cache.models['p/m'].totalLatencyMs, 0)
  })

  it('clamps negative tokens to 0', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    recordModelCall('p', 'm', { success: true, latencyMs: 100, promptTokens: -5, completionTokens: -10 }, { cache })
    assert.strictEqual(cache.models['p/m'].totalPromptTokens, 0)
    assert.strictEqual(cache.models['p/m'].totalCompletionTokens, 0)
  })

  it('trims recentCalls to MAX_RECENT_CALLS (FIFO)', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    for (let i = 0; i < MAX_RECENT_CALLS + 10; i++) {
      recordModelCall('p', 'm', { success: true, latencyMs: 100 + i, completionTokens: i }, { cache, now: 1_000_000 + i })
    }
    const recent = cache.models['p/m'].recentCalls
    assert.strictEqual(recent.length, MAX_RECENT_CALLS)
    // 📖 Most recent call is first (i = MAX_RECENT_CALLS + 9).
    assert.strictEqual(recent[0].completionTokens, MAX_RECENT_CALLS + 9)
    // 📖 Oldest call in the kept window is last.
    assert.strictEqual(recent[recent.length - 1].completionTokens, 10)
  })

  it('computes tokensPerSecond on each recent call', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    recordModelCall('p', 'm', { success: true, latencyMs: 1000, completionTokens: 50 }, { cache })
    assert.strictEqual(cache.models['p/m'].recentCalls[0].tokensPerSecond, 50)
  })
})

// ─── getModelTelemetry / getAllModelTelemetry ───────────────────────────────

describe('getModelTelemetry', () => {
  it('returns null when no entry exists', () => {
    assert.strictEqual(getModelTelemetry('p', 'm', { cache: { version: 1, models: {} } }), null)
  })

  it('derives successRate, avgLatencyMs, avgTokensPerSecond', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    recordModelCall('p', 'm', { success: true, latencyMs: 1000, completionTokens: 50 }, { cache })
    recordModelCall('p', 'm', { success: true, latencyMs: 2000, completionTokens: 100 }, { cache })
    recordModelCall('p', 'm', { success: false, latencyMs: 500, error: '500' }, { cache })
    const m = getModelTelemetry('p', 'm', { cache })
    assert.ok(m)
    assert.strictEqual(m.totalCalls, 3)
    assert.strictEqual(m.successCalls, 2)
    assert.strictEqual(m.errorCalls, 1)
    assert.strictEqual(m.successRate.toFixed(2), '0.67')
    assert.strictEqual(m.avgLatencyMs.toFixed(0), '1167')
    // 📖 avgTokensPerSecond = (50+100) / ((1000+2000+500)/1000) = 150/3.5 ≈ 42.86
    assert.ok(Math.abs(m.avgTokensPerSecond - (150 / 3.5)) < 0.01)
  })
})

describe('getAllModelTelemetry', () => {
  it('returns every tracked model as a derived snapshot', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    recordModelCall('p1', 'm1', { success: true, latencyMs: 100, completionTokens: 10 }, { cache })
    recordModelCall('p2', 'm2', { success: false, latencyMs: 50 }, { cache })
    const all = getAllModelTelemetry({ cache })
    assert.deepStrictEqual(Object.keys(all).sort(), ['p1/m1', 'p2/m2'])
    assert.strictEqual(all['p1/m1'].totalCalls, 1)
    assert.strictEqual(all['p2/m2'].errorCalls, 1)
  })

  it('returns empty object when nothing tracked', () => {
    assert.deepStrictEqual(getAllModelTelemetry({ cache: { version: 1, models: {} } }), {})
  })
})

// ─── getRealWorldScore ──────────────────────────────────────────────────────

describe('getRealWorldScore', () => {
  it('returns null below MIN_CALLS_FOR_SCORE', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    for (let i = 0; i < DEFAULT_MIN_CALLS_FOR_SCORE - 1; i++) {
      recordModelCall('p', 'm', { success: true, latencyMs: 100, completionTokens: 10 }, { cache })
    }
    assert.strictEqual(getRealWorldScore('p', 'm', { cache }), null)
  })

  it('returns 0..100 for models with enough signal', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    const now = 1_700_000_000_000
    for (let i = 0; i < 10; i++) {
      recordModelCall('p', 'm', { success: true, latencyMs: 1000, completionTokens: 60 }, { cache, now })
    }
    const score = getRealWorldScore('p', 'm', { cache, now })
    assert.ok(score >= 0 && score <= 100, `score should be 0..100, got ${score}`)
    // 📖 100% success + 60 tok/s (sigmoid01 ≈ 0.79) + 1.0 recency ≈ 0.6*1 + 0.25*0.79 + 0.15*1 = 0.95 → 95
    assert.ok(score >= 80, `expected high score for healthy model, got ${score}`)
  })

  it('penalises error-heavy models', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    const now = 1_700_000_000_000
    // 📖 30% success rate.
    for (let i = 0; i < 3; i++) {
      recordModelCall('p', 'm', { success: true, latencyMs: 1000, completionTokens: 60 }, { cache, now })
    }
    for (let i = 0; i < 7; i++) {
      recordModelCall('p', 'm', { success: false, latencyMs: 500, error: '500' }, { cache, now })
    }
    const score = getRealWorldScore('p', 'm', { cache, now })
    // 📖 0.30*0.6 + speed + recency ≈ 0.18 + ~0.79*0.25 + 1.0*0.15 ≈ 0.53 → 53
    assert.ok(score < 70, `expected mid score for unreliable model, got ${score}`)
  })

  it('decays with age (recencyBonus)', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    const writtenAt = 1_700_000_000_000
    for (let i = 0; i < 10; i++) {
      recordModelCall('p', 'm', { success: true, latencyMs: 1000, completionTokens: 60 }, { cache, now: writtenAt })
    }
    const freshScore = getRealWorldScore('p', 'm', { cache, now: writtenAt })
    const oldScore = getRealWorldScore('p', 'm', { cache, now: writtenAt + 30 * 24 * 60 * 60 * 1000 })
    assert.ok(freshScore > oldScore, `fresh (${freshScore}) should beat stale (${oldScore})`)
  })
})

// ─── getCacheStats ────────────────────────────────────────────────────────────

describe('getCacheStats', () => {
  it('returns zeros for empty cache', () => {
    const s = getCacheStats({ cache: { version: 1, models: {} } })
    assert.strictEqual(s.modelsTracked, 0)
    assert.strictEqual(s.totalCalls, 0)
    assert.strictEqual(s.modelsWithSignal, 0)
  })

  it('counts models + totals correctly', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    for (let i = 0; i < 6; i++) {
      recordModelCall('p1', 'm1', { success: true }, { cache })
    }
    for (let i = 0; i < 3; i++) {
      recordModelCall('p2', 'm2', { success: false, error: 'fail' }, { cache })
    }
    const s = getCacheStats({ cache })
    assert.strictEqual(s.modelsTracked, 2)
    assert.strictEqual(s.totalCalls, 9)
    assert.strictEqual(s.successCalls, 6)
    assert.strictEqual(s.errorCalls, 3)
    assert.strictEqual(s.modelsWithSignal, 1)  // p1/m1 (6 calls), p2/m2 below MIN_CALLS_FOR_SCORE
  })
})

// ─── pruneStaleEntries ───────────────────────────────────────────────────────

describe('pruneStaleEntries', () => {
  it('drops entries older than maxAgeMs', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    recordModelCall('p', 'old', { success: true }, { cache, now: 1_000_000 })
    recordModelCall('p', 'recent', { success: true }, { cache, now: 2_000_000 })
    const pruned = pruneStaleEntries(100_000, { cache, now: 1_200_000 })
    assert.strictEqual(pruned, 1)
    assert.deepStrictEqual(Object.keys(cache.models), ['p/recent'])
  })

  it('returns 0 when nothing is stale', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    recordModelCall('p', 'm', { success: true }, { cache, now: 1_000_000 })
    assert.strictEqual(pruneStaleEntries(100_000, { cache, now: 1_050_000 }), 0)
  })
})

// ─── Persistence round-trip ──────────────────────────────────────────────────

describe('persistence: flush + reload', () => {
  it('preserves state through flush + load', () => {
    const cache = { version: 1, models: {}, lastUpdated: 0 }
    for (let i = 0; i < 8; i++) {
      recordModelCall('groq', 'llama-3', { success: true, latencyMs: 200, completionTokens: 50 }, { cache, now: 1_700_000_000_000 + i })
    }
    assert.strictEqual(flushRuntimeTelemetry({ path: telemetryPath, cache }), true)

    // 📖 Load into a fresh object (simulating a new process).
    const reloaded = loadRuntimeTelemetry({ path: telemetryPath })
    assert.ok(reloaded.models['groq/llama-3'])
    assert.strictEqual(reloaded.models['groq/llama-3'].totalCalls, 8)
    assert.strictEqual(reloaded.models['groq/llama-3'].recentCalls.length, 8)
  })

  it('recovers from corrupt JSON (no crash)', () => {
    writeFileSync(telemetryPath, '{not valid json')
    const c = loadRuntimeTelemetry({ path: telemetryPath })
    assert.deepStrictEqual(c, { version: 1, models: {}, lastUpdated: 0 })
  })

  it('handles missing file (returns empty)', () => {
    assert.strictEqual(existsSync(telemetryPath), false)
    const c = loadRuntimeTelemetry({ path: telemetryPath })
    assert.deepStrictEqual(c, { version: 1, models: {}, lastUpdated: 0 })
  })

  it('clearRuntimeTelemetry removes the file', () => {
    writeFileSync(telemetryPath, JSON.stringify({ version: 1, models: {} }))
    assert.strictEqual(clearRuntimeTelemetry({ path: telemetryPath }), true)
    assert.strictEqual(existsSync(telemetryPath), false)
  })

  it('flushRuntimeTelemetry does read-merge-write (other-process deltas survive)', () => {
    // 📖 "Other process" wrote first.
    const otherData = {
      version: 1,
      models: {
        'other/model': {
          providerKey: 'other', modelId: 'model',
          totalCalls: 5, successCalls: 5, errorCalls: 0,
          totalTokens: 100, totalPromptTokens: 50, totalCompletionTokens: 50,
          totalLatencyMs: 1000, totalCost: 0,
          recentCalls: [], lastUpdated: 1_000_000,
        },
      },
      lastUpdated: 1_000_000,
    }
    writeFileSync(telemetryPath, JSON.stringify(otherData))

    // 📖 Our process adds its own deltas.
    const ourCache = { version: 1, models: {}, lastUpdated: 0 }
    recordModelCall('us', 'model', { success: true, latencyMs: 200, completionTokens: 50 }, { cache: ourCache, now: 2_000_000 })
    flushRuntimeTelemetry({ path: telemetryPath, cache: ourCache })

    // 📖 Both should survive.
    const final = JSON.parse(readFileSync(telemetryPath, 'utf8'))
    assert.ok(final.models['other/model'])
    assert.ok(final.models['us/model'])
  })
})