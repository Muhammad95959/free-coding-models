// 📖 Tests for provider-metadata.js — specifically the fcm_router entry added
// 📖 to fix issue #140 ("Unknown fcm_router" in TUI when daemon not running).
// 📖 Without this entry, every call to PROVIDER_METADATA[fcm_router] returned
// 📖 undefined, and callers fell through to the raw key (`fcm_router`) which
// 📖 users read as "Unknown".

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  PROVIDER_METADATA,
  getProviderLabelWithBilling,
} from '../src/core/provider-metadata.js'

test('PROVIDER_METADATA has fcm_router entry (issue #140)', () => {
  const meta = PROVIDER_METADATA.fcm_router
  assert.ok(meta, 'PROVIDER_METADATA.fcm_router must exist')
  assert.equal(typeof meta.label, 'string')
  assert.ok(meta.label.length > 0, 'label must be a non-empty string')
})

test('fcm_router label is human-readable (not the raw key)', () => {
  const meta = PROVIDER_METADATA.fcm_router
  assert.notEqual(meta.label, 'fcm_router', 'label must not be the raw provider key')
  // 📖 Must contain a hint about it being a router / daemon
  assert.match(meta.label, /router|daemon/i, `label "${meta.label}" should mention router or daemon`)
})

test('fcm_router has no signup URL or hint (it is local)', () => {
  const meta = PROVIDER_METADATA.fcm_router
  // 📖 Either absent or explicitly null — signupUrl/signupHint are misleading for a local daemon.
  assert.ok(!meta.signupUrl || meta.signupUrl === null, 'signupUrl should be null/absent')
  assert.ok(!meta.signupHint || meta.signupHint === null, 'signupHint should be null/absent')
})

test('fcm_router marks itself as no-key-needed (local daemon, no API key)', () => {
  // 📖 app.js:210 checks noKeyNeeded to decide if the provider is "usable" without a key.
  assert.equal(PROVIDER_METADATA.fcm_router.noKeyNeeded, true)
})

test('getProviderLabelWithBilling(fcm_router) returns the fcm_router label', () => {
  const label = getProviderLabelWithBilling('fcm_router')
  // 📖 Should NOT fall through to the raw key.
  assert.notEqual(label, 'fcm_router')
  assert.equal(label, PROVIDER_METADATA.fcm_router.label)
})

test('getProviderLabelWithBilling preserves backwards compat for known providers', () => {
  // 📖 Spot-check that adding fcm_router didn't break other providers.
  assert.match(getProviderLabelWithBilling('groq'), /Groq/)
  assert.match(getProviderLabelWithBilling('nvidia'), /NVIDIA/)
  assert.match(getProviderLabelWithBilling('cerebras'), /Cerebras/)
})

test('getProviderLabelWithBilling falls back gracefully for unknown keys', () => {
  // 📖 Unknown providers should still return SOMETHING, not throw.
  const label = getProviderLabelWithBilling('totally-unknown-provider-xyz')
  assert.equal(typeof label, 'string')
  assert.ok(label.length > 0)
})