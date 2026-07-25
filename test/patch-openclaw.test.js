// 📖 Tests for patch-openclaw.js context-window parsing helpers.
// 📖 Re-extracts parseCtx/defaultMaxTokens from the script via a small VM
// 📖 eval so we don't need to refactor the script into a module just for tests.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Extract helpers from patch-openclaw.js via regex ──────────────────────────
// 📖 The script is a top-level ESM with helper functions we want to unit-test.
// 📖 Easiest path: source the file body, isolate the function declarations, and
// 📖 evaluate them in a sandboxed Function with stubbed fs/os/path imports.
const SCRIPT = readFileSync(join(__dirname, '..', 'patch-openclaw.js'), 'utf8')

function loadHelpers() {
  // 📖 Grab from the first `function` (parseCtx) through the last helper (defaultMaxTokens).
  const startIdx = SCRIPT.indexOf('function parseCtx')
  const endIdx = SCRIPT.indexOf('\n// ─── Patch models.json')
  if (startIdx < 0 || endIdx < 0) throw new Error('patch-openclaw.js layout changed; tests need updating')
  const body = SCRIPT.slice(startIdx, endIdx)
  // Wrap into a Function that returns the helpers
  // eslint-disable-next-line no-new-func
  const factory = new Function(`${body}\nreturn { parseCtx, defaultMaxTokens }`)
  return factory()
}

const { parseCtx, defaultMaxTokens } = loadHelpers()

// ─── parseCtx ─────────────────────────────────────────────────────────────────
test('parseCtx: handles k suffix', () => {
  assert.equal(parseCtx('200k'), 200_000)
  assert.equal(parseCtx('128k'), 128_000)
  assert.equal(parseCtx('32k'), 32_000)
  assert.equal(parseCtx('1k'), 1_000)
})

test('parseCtx: handles K suffix (case-insensitive)', () => {
  assert.equal(parseCtx('200K'), 200_000)
  assert.equal(parseCtx('64K'), 64_000)
})

test('parseCtx: handles M suffix', () => {
  assert.equal(parseCtx('1M'), 1_000_000)
  assert.equal(parseCtx('2M'), 2_000_000)
})

test('parseCtx: handles m suffix (case-insensitive)', () => {
  assert.equal(parseCtx('1m'), 1_000_000)
})

test('parseCtx: handles no suffix (raw number)', () => {
  assert.equal(parseCtx('8192'), 8192)
  assert.equal(parseCtx('100'), 100)
})

test('parseCtx: handles whitespace', () => {
  assert.equal(parseCtx('  200k  '), 200_000)
})

test('parseCtx: falls back to 8192 for invalid input', () => {
  assert.equal(parseCtx(''), 8192)
  assert.equal(parseCtx('abc'), 8192)
  assert.equal(parseCtx(null), 8192)
  assert.equal(parseCtx(undefined), 8192)
  assert.equal(parseCtx(123), 8192) // non-string
})

// ─── defaultMaxTokens ──────────────────────────────────────────────────────────
test('defaultMaxTokens: ~5% of context, clamped to [2048, 16384]', () => {
  assert.equal(defaultMaxTokens(32_000), 2048) // 5% of 32k = 1600, clamped up to 2048
  assert.equal(defaultMaxTokens(200_000), 10_000) // 5% of 200k = 10000
  assert.equal(defaultMaxTokens(128_000), 6_400) // 5% of 128k = 6400
  assert.equal(defaultMaxTokens(1_000_000), 16_384) // 5% of 1M = 50000, clamped down to 16384
})

test('defaultMaxTokens: never below 2048', () => {
  assert.equal(defaultMaxTokens(1000), 2048) // 5% = 50, clamped up
})

test('defaultMaxTokens: never above 16384', () => {
  assert.equal(defaultMaxTokens(10_000_000), 16_384) // huge context, clamped down
})

// ─── Integration: real sources.js values ───────────────────────────────────────
test('integration: real sources.js ctx values parse correctly', () => {
  // 📖 These are actual values from sources.js as of the test creation date.
  // 📖 If sources.js adds new ctx formats, this test will catch regressions.
  const realValues = [
    ['200k', 200_000, 10_000],
    ['128k', 128_000, 6_400],
    ['262k', 262_000, 13_100],
    ['1M', 1_000_000, 16_384],
    ['256k', 256_000, 12_800],
  ]
  for (const [input, expectedCtx, expectedMax] of realValues) {
    assert.equal(parseCtx(input), expectedCtx, `parseCtx(${input})`)
    assert.equal(defaultMaxTokens(parseCtx(input)), expectedMax, `defaultMaxTokens(${input})`)
  }
})