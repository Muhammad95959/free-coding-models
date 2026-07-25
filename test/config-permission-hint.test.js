// 📖 Tests for the permission-error hint added to fix issue #119.
// 📖 When saveConfig hits EACCES/EPERM, we surface a Docker-specific hint
// 📖 explaining that chmod doesn't fix ownership and how to recreate the volume.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { formatPermissionHint } from '../src/core/config.js'

test('formatPermissionHint: empty string for non-permission errors', () => {
  assert.equal(formatPermissionHint({ code: 'ENOENT', message: 'no such file' }), '')
  assert.equal(formatPermissionHint({ code: 'EIO', message: 'i/o error' }), '')
  assert.equal(formatPermissionHint({ message: 'generic failure' }), '')
})

test('formatPermissionHint: triggers on EACCES', () => {
  const err = { code: 'EACCES', message: 'permission denied' }
  const hint = formatPermissionHint(err)
  assert.ok(hint.length > 0, 'EACCES should produce a hint')
  assert.match(hint, /permission|ownership|EACCES|EUID/i)
})

test('formatPermissionHint: triggers on EPERM', () => {
  const err = { code: 'EPERM', message: 'operation not permitted' }
  const hint = formatPermissionHint(err)
  assert.ok(hint.length > 0, 'EPERM should produce a hint')
  assert.match(hint, /permission|ownership|EUID/i)
})

test('formatPermissionHint: mentions Docker volume recreation', () => {
  const hint = formatPermissionHint({ code: 'EACCES', message: 'denied' })
  assert.match(hint, /docker/i, 'should mention docker')
  assert.match(hint, /volume/i, 'should mention volume')
  assert.match(hint, /compose (up|down)/i, 'should give docker compose command')
})

test('formatPermissionHint: explicitly says chmod does NOT fix it', () => {
  const hint = formatPermissionHint({ code: 'EACCES', message: 'denied' })
  // 📖 The hint should make it clear that chmod is not the fix — ownership is.
  // 📖 Phrasing varies ("not a chmod issue"), so match loosely.
  assert.match(hint, /(not a chmod|chmod (doesn|does not|won|will not))/i, 'should clarify that chmod alone is not enough')
})

test('formatPermissionHint: returns a multi-line string with hints', () => {
  const hint = formatPermissionHint({ code: 'EACCES', message: 'denied' })
  const lines = hint.split('\n').filter((l) => l.trim().length > 0)
  assert.ok(lines.length >= 5, `expected at least 5 lines of hints, got ${lines.length}`)
})