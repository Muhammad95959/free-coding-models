/**
 * @file test/passive-quota.test.js
 * @description Tests for the passive rate-limit header tracker added to provider-quota-fetchers.js (t2).
 *
 * Covers:
 *   - All 6 HEADER_PAIRS parse correctly (one test each)
 *   - Case-insensitivity (uppercase, mixed-case keys)
 *   - First-pair-wins priority (when multiple present, higher-priority pair used)
 *   - Garbage values (NaN, strings, negative limit, limit=0) → returns null
 *   - Missing pair → returns null
 *   - processResponseHeaders writes to the in-memory map
 *   - getQuota merges passive + active, freshest wins
 *   - Staleness: snapshot older than 5 min → returns null
 *   - getAllQuotas unions both stores
 *   - formatQuotaStatus: present + stale + missing cases
 *   - Headers object accepts both Fetch Headers and plain object
 */

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import {
  extractQuota,
  processResponseHeaders,
  getQuota,
  getAllQuotas,
  formatQuotaStatus,
  resetPassiveQuota,
  HEADER_PAIRS,
  STALENESS_MS,
  QUOTA_WINDOW_LABELS,
} from '../src/core/provider-quota-fetchers.js'

beforeEach(() => {
  // 📖 Reset passive map between tests so order doesn't leak state.
  resetPassiveQuota()
})

// ─── HEADER_PAIRS structure ──────────────────────────────────────────────────

describe('HEADER_PAIRS structure', () => {
  it('contains 8 pairs in priority order', () => {
    assert.strictEqual(HEADER_PAIRS.length, 8)
    for (const pair of HEADER_PAIRS) {
      assert.strictEqual(typeof pair[0], 'string')
      assert.strictEqual(typeof pair[1], 'string')
      assert.ok(pair[0].length > 0 && pair[1].length > 0)
    }
  })

  it('STALENESS_MS is 5 minutes', () => {
    assert.strictEqual(STALENESS_MS, 5 * 60 * 1000)
  })

  it('QUOTA_WINDOW_LABELS maps suffix → short label', () => {
    assert.strictEqual(QUOTA_WINDOW_LABELS.day, 'day')
    assert.strictEqual(QUOTA_WINDOW_LABELS.requests, 'min')
    assert.strictEqual(QUOTA_WINDOW_LABELS.tokens, 'tok')
    assert.strictEqual(QUOTA_WINDOW_LABELS['tokens-minute'], 'tok/min')
  })
})

// ─── extractQuota — header pair coverage ─────────────────────────────────────

describe('extractQuota — header pair coverage', () => {
  it('pair 1: x-ratelimit-remaining-requests / x-ratelimit-limit-requests (SambaNova)', () => {
    const r = extractQuota({ 'x-ratelimit-remaining-requests': '14', 'x-ratelimit-limit-requests': '30' })
    assert.deepStrictEqual(r, {
      remaining: 14, limit: 30, percent: 47,
      source: 'x-ratelimit-remaining-requests',
      windowType: 'requests',
    })
  })

  it('pair 2: x-ratelimit-remaining / x-ratelimit-limit (Mistral / generic)', () => {
    const r = extractQuota({ 'x-ratelimit-remaining': '100', 'x-ratelimit-limit': '200' })
    assert.deepStrictEqual(r, {
      remaining: 100, limit: 200, percent: 50,
      source: 'x-ratelimit-remaining',
      windowType: 'requests',
    })
  })

  it('pair 3: ratelimit-remaining-requests / ratelimit-limit-requests (proxy no-x-)', () => {
    const r = extractQuota({ 'ratelimit-remaining-requests': '5', 'ratelimit-limit-requests': '60' })
    assert.deepStrictEqual(r, {
      remaining: 5, limit: 60, percent: 8,
      source: 'ratelimit-remaining-requests',
      windowType: 'requests',
    })
  })

  it('pair 4: ratelimit-remaining / ratelimit-limit (proxy generic)', () => {
    const r = extractQuota({ 'ratelimit-remaining': '42', 'ratelimit-limit': '100' })
    assert.deepStrictEqual(r, {
      remaining: 42, limit: 100, percent: 42,
      source: 'ratelimit-remaining',
      windowType: 'requests',
    })
  })

  it('pair 5: x-ratelimit-remaining-requests-day / x-ratelimit-limit-requests-day (SambaNova daily)', () => {
    const r = extractQuota({ 'x-ratelimit-remaining-requests-day': '1500', 'x-ratelimit-limit-requests-day': '14400' })
    assert.deepStrictEqual(r, {
      remaining: 1500, limit: 14400, percent: 10,
      source: 'x-ratelimit-remaining-requests-day',
      windowType: 'day',
    })
  })

  it('pair 6: x-ratelimit-remaining-day / x-ratelimit-limit-day (generic daily)', () => {
    const r = extractQuota({ 'x-ratelimit-remaining-day': '5000', 'x-ratelimit-limit-day': '10000' })
    assert.deepStrictEqual(r, {
      remaining: 5000, limit: 10000, percent: 50,
      source: 'x-ratelimit-remaining-day',
      windowType: 'day',
    })
  })

  it('pair 7: x-ratelimit-remaining-tokens / x-ratelimit-limit-tokens (Cerebras tokens)', () => {
    const r = extractQuota({ 'x-ratelimit-remaining-tokens': '500', 'x-ratelimit-limit-tokens': '1000' })
    assert.deepStrictEqual(r, {
      remaining: 500, limit: 1000, percent: 50,
      source: 'x-ratelimit-remaining-tokens',
      windowType: 'tokens',
    })
  })

  it('pair 8: x-ratelimit-remaining-tokens-minute / x-ratelimit-limit-tokens-minute (Cerebras token-minute)', () => {
    const r = extractQuota({ 'x-ratelimit-remaining-tokens-minute': '12000', 'x-ratelimit-limit-tokens-minute': '30000' })
    assert.deepStrictEqual(r, {
      remaining: 12000, limit: 30000, percent: 40,
      source: 'x-ratelimit-remaining-tokens-minute',
      windowType: 'tokens-minute',
    })
  })
})

// ─── extractQuota — robustness ───────────────────────────────────────────────

describe('extractQuota — robustness', () => {
  it('returns null when no header pair matches', () => {
    assert.strictEqual(extractQuota({ 'content-type': 'application/json' }), null)
    assert.strictEqual(extractQuota({}), null)
    assert.strictEqual(extractQuota(null), null)
    assert.strictEqual(extractQuota(undefined), null)
  })

  it('returns null when remaining is missing', () => {
    assert.strictEqual(extractQuota({ 'x-ratelimit-limit-requests': '30' }), null)
  })

  it('returns null when limit is missing', () => {
    assert.strictEqual(extractQuota({ 'x-ratelimit-remaining-requests': '14' }), null)
  })

  it('returns null when remaining is non-numeric', () => {
    assert.strictEqual(
      extractQuota({ 'x-ratelimit-remaining-requests': 'abc', 'x-ratelimit-limit-requests': '30' }),
      null,
    )
  })

  it('returns null when limit is zero (avoid div-by-zero)', () => {
    assert.strictEqual(
      extractQuota({ 'x-ratelimit-remaining-requests': '0', 'x-ratelimit-limit-requests': '0' }),
      null,
    )
  })

  it('returns null when limit is negative', () => {
    assert.strictEqual(
      extractQuota({ 'x-ratelimit-remaining-requests': '5', 'x-ratelimit-limit-requests': '-10' }),
      null,
    )
  })

  it('clamps percent to [0, 100]', () => {
    // 📖 remaining > limit shouldn't happen but must clamp.
    const over = extractQuota({ 'x-ratelimit-remaining-requests': '110', 'x-ratelimit-limit-requests': '100' })
    assert.strictEqual(over.percent, 100)
    // 📖 remaining < 0 also clamps.
    const neg = extractQuota({ 'x-ratelimit-remaining-requests': '-5', 'x-ratelimit-limit-requests': '100' })
    assert.strictEqual(neg.percent, 0)
  })

  it('first-pair-wins priority (when multiple present, higher-priority pair used)', () => {
    // 📖 Both pair 1 and pair 2 present — pair 1 must win.
    const r = extractQuota({
      'x-ratelimit-remaining-requests': '14',
      'x-ratelimit-limit-requests': '30',
      'x-ratelimit-remaining': '99',
      'x-ratelimit-limit': '100',
    })
    assert.strictEqual(r.source, 'x-ratelimit-remaining-requests')
    assert.strictEqual(r.remaining, 14)
    assert.strictEqual(r.limit, 30)
  })

  it('is case-insensitive (uppercase keys)', () => {
    const r = extractQuota({ 'X-RATELIMIT-REMAINING-REQUESTS': '5', 'X-RATELIMIT-LIMIT-REQUESTS': '30' })
    assert.ok(r, 'uppercase keys should still parse')
    assert.strictEqual(r.remaining, 5)
  })

  it('is case-insensitive (mixed-case keys)', () => {
    const r = extractQuota({ 'X-Ratelimit-Remaining-Requests': '5', 'x-Ratelimit-Limit-Requests': '30' })
    assert.ok(r)
    assert.strictEqual(r.remaining, 5)
  })

  it('accepts a Fetch Headers object', () => {
    const h = new Map([
      ['x-ratelimit-remaining-requests', '5'],
      ['x-ratelimit-limit-requests', '30'],
    ])
    const fakeHeaders = { get: (k) => h.get(k.toLowerCase()) ?? null }
    const r = extractQuota(fakeHeaders)
    assert.ok(r)
    assert.strictEqual(r.remaining, 5)
  })
})

// ─── processResponseHeaders ──────────────────────────────────────────────────

describe('processResponseHeaders', () => {
  it('writes a snapshot when headers parse', () => {
    const ok = processResponseHeaders('groq', {
      'x-ratelimit-remaining-requests': '12',
      'x-ratelimit-limit-requests': '30',
    }, { now: 1_000_000 })
    assert.strictEqual(ok, true)
    const snap = getQuota('groq', { now: 1_000_000 })
    assert.ok(snap)
    assert.strictEqual(snap.percent, 40)
    assert.strictEqual(snap.source, 'header')
    assert.strictEqual(snap.lastUpdated, 1_000_000)
  })

  it('returns false and does not write when no headers match', () => {
    const ok = processResponseHeaders('cerebras', { 'content-type': 'json' }, { now: 2_000_000 })
    assert.strictEqual(ok, false)
    assert.strictEqual(getQuota('cerebras', { now: 2_000_000 }), null)
  })

  it('overwrites previous snapshot for the same provider', () => {
    processResponseHeaders('groq', { 'x-ratelimit-remaining-requests': '10', 'x-ratelimit-limit-requests': '30' }, { now: 1 })
    processResponseHeaders('groq', { 'x-ratelimit-remaining-requests': '20', 'x-ratelimit-limit-requests': '30' }, { now: 2 })
    const snap = getQuota('groq', { now: 2 })
    assert.strictEqual(snap.remaining, 20)
    assert.strictEqual(snap.lastUpdated, 2)
  })

  it('ignores empty / non-string providerKey', () => {
    assert.strictEqual(processResponseHeaders('', { 'x-ratelimit-remaining-requests': '1' }), false)
    assert.strictEqual(processResponseHeaders(null, { 'x-ratelimit-remaining-requests': '1' }), false)
    assert.strictEqual(processResponseHeaders(undefined, { 'x-ratelimit-remaining-requests': '1' }), false)
  })
})

// ─── getQuota ────────────────────────────────────────────────────────────────

describe('getQuota', () => {
  it('returns null when provider has no signal at all', () => {
    assert.strictEqual(getQuota('unknown-provider', { now: Date.now() }), null)
  })

  it('returns the passive snapshot when present and fresh', () => {
    const now = 5_000_000
    processResponseHeaders('groq', { 'x-ratelimit-remaining-requests': '7', 'x-ratelimit-limit-requests': '30' }, { now })
    const snap = getQuota('groq', { now })
    assert.ok(snap)
    assert.strictEqual(snap.percent, 23)  // 7/30 = 23
  })

  it('returns null when passive snapshot is older than STALENESS_MS', () => {
    const writtenAt = 1_000_000
    const now = writtenAt + STALENESS_MS + 1
    processResponseHeaders('groq', { 'x-ratelimit-remaining-requests': '7', 'x-ratelimit-limit-requests': '30' }, { now: writtenAt })
    assert.strictEqual(getQuota('groq', { now }), null)
  })

  it('honors custom maxAgeMs override', () => {
    const writtenAt = 1_000_000
    processResponseHeaders('groq', { 'x-ratelimit-remaining-requests': '7', 'x-ratelimit-limit-requests': '30' }, { now: writtenAt })
    // 📖 Snapshot is 50ms old and we allow 100ms — still fresh.
    assert.ok(getQuota('groq', { now: writtenAt + 50, maxAgeMs: 100 }))
    // 📖 500ms later with same 100ms cap — stale.
    assert.strictEqual(getQuota('groq', { now: writtenAt + 500, maxAgeMs: 100 }), null)
    // 📖 1 hour later with default 5min cap — stale.
    assert.strictEqual(getQuota('groq', { now: writtenAt + 3_600_000 }), null)
  })
})

// ─── getAllQuotas ────────────────────────────────────────────────────────────

describe('getAllQuotas', () => {
  it('returns an empty map when nothing tracked', () => {
    const all = getAllQuotas()
    assert.strictEqual(all.size, 0)
  })

  it('returns every provider with a fresh passive snapshot', () => {
    const now = 1_000_000
    processResponseHeaders('groq', { 'x-ratelimit-remaining-requests': '5', 'x-ratelimit-limit-requests': '30' }, { now })
    processResponseHeaders('cerebras', { 'x-ratelimit-remaining-requests': '90', 'x-ratelimit-limit-requests': '100' }, { now })
    const all = getAllQuotas({ now })
    assert.strictEqual(all.size, 2)
    assert.strictEqual(all.get('groq').percent, 17)
    assert.strictEqual(all.get('cerebras').percent, 90)
  })

  it('excludes stale entries', () => {
    const writtenAt = 1_000_000
    processResponseHeaders('groq', { 'x-ratelimit-remaining-requests': '5', 'x-ratelimit-limit-requests': '30' }, { now: writtenAt })
    const all = getAllQuotas({ now: writtenAt + STALENESS_MS + 1 })
    assert.strictEqual(all.size, 0)
  })
})

// ─── formatQuotaStatus ───────────────────────────────────────────────────────

describe('formatQuotaStatus', () => {
  it('returns undefined when no snapshot exists', () => {
    assert.strictEqual(formatQuotaStatus('groq'), undefined)
  })

  it('returns undefined when snapshot is stale', () => {
    const writtenAt = 1_000_000
    processResponseHeaders('groq', { 'x-ratelimit-remaining-requests': '5', 'x-ratelimit-limit-requests': '30' }, { now: writtenAt })
    assert.strictEqual(formatQuotaStatus('groq', { now: writtenAt + STALENESS_MS + 1 }), undefined)
  })

  it('formats a healthy snapshot with 📊', () => {
    const now = 1_000_000
    processResponseHeaders('groq', { 'x-ratelimit-remaining-requests': '25', 'x-ratelimit-limit-requests': '30' }, { now })
    const s = formatQuotaStatus('groq', { now })
    assert.ok(s.startsWith('📊 '), `expected 📊 prefix, got: ${s}`)
    assert.ok(s.includes('groq'))
    assert.ok(s.includes('25/30'))
    assert.ok(s.includes('83%'))
    assert.ok(s.includes('[min]'))
  })

  it('formats a low snapshot with ⚠️ (≤ 25%)', () => {
    const now = 1_000_000
    processResponseHeaders('groq', { 'x-ratelimit-remaining-requests': '5', 'x-ratelimit-limit-requests': '30' }, { now })
    const s = formatQuotaStatus('groq', { now })
    assert.ok(s.startsWith('⚠️'), `expected ⚠️ prefix, got: ${s}`)
  })

  it('formats a critical snapshot with 🚨 (≤ 10%)', () => {
    const now = 1_000_000
    processResponseHeaders('groq', { 'x-ratelimit-remaining-requests': '2', 'x-ratelimit-limit-requests': '30' }, { now })
    const s = formatQuotaStatus('groq', { now })
    assert.ok(s.startsWith('🚨'), `expected 🚨 prefix, got: ${s}`)
  })

  it('uses [day] label when windowType is daily', () => {
    const now = 1_000_000
    processResponseHeaders('groq', { 'x-ratelimit-remaining-requests-day': '5000', 'x-ratelimit-limit-requests-day': '10000' }, { now })
    const s = formatQuotaStatus('groq', { now })
    assert.ok(s.includes('[day]'), `expected [day] suffix, got: ${s}`)
  })
})