/**
 * @file provider-cooldown.js
 * @description Per-provider quota circuit-breaker for the health-ping loop.
 *
 * @details
 *   📖 Why this exists:
 *   📖 - OpenRouter (and similar rate-limited gateways) enforce rate limits at the
 *   📖   **provider/key** level, not per-model. A single 429 "Rate limit exceeded"
 *   📖   response means **the whole key is paused**, often for hours.
 *   📖 - Without this breaker, FCM keeps re-pinging every model of that provider
 *   📖   every 2–30 seconds (because probe-cache treats `broken` as always-due),
 *   📖   burning the user's daily quota in minutes (issue #146).
 *   📖 - This module exposes a tiny in-memory map of paused providers so the ping
 *   📖   loop can short-circuit them until the Retry-After window expires.
 *
 *   📖 Design notes:
 *   📖 - In-memory only, intentionally. The pause is short-lived (minutes to hours)
 *   📖   and we don't want a stale pause to outlive a server-side reset.
 *   📖 - `pauseProviderQuota` keeps the **maximum** pause if the provider is already
 *   📖   paused, so a rapid succession of 429s with decreasing Retry-After values
 *   📖   never accidentally **shortens** an existing longer pause.
 *
 * @functions
 *   → isProviderQuotaPaused(providerKey, now?)              — Is this provider currently paused?
 *   → pauseProviderQuota(providerKey, ms)                    — Set a pause for ms milliseconds
 *   → providerQuotaPauseRemaining(providerKey, now?)        — ms left in the current pause
 *   → listPausedProviders(now?)                              — Diagnostic: {[providerKey]: remainingMs}
 *   → clearProviderQuotaPause(providerKey)                   — Force-reset (testing/escape hatch)
 *   → parseRetryAfterMs(value)                               — Header-only Retry-After parser
 *   → extractRetryAfterFromResponse(resp)                    — Header + body parser (OR style message)
 *
 * @exports isProviderQuotaPaused, pauseProviderQuota, providerQuotaPauseRemaining,
 *          listPausedProviders, clearProviderQuotaPause, parseRetryAfterMs,
 *          extractRetryAfterFromResponse
 */

// ─── Module state ─────────────────────────────────────────────────────────────

/**
 * 📖 Map<providerKey, timestamp-ms> until which the provider's quota is considered
 * 📖 paused. `now >= value` means the pause has expired and the entry is purged lazily.
 */
const providerQuotaPausedUntil = new Map()

// ─── Pure helpers (exported, easy to unit test) ───────────────────────────────

/**
 * 📖 parseRetryAfterMs: Parse a Retry-After header value into milliseconds.
 * 📖 Accepts either a plain-seconds integer ("120") or an HTTP-date ("Wed, 21 Oct 2026 07:28:00 GMT").
 * 📖 Returns null if the value is missing, malformed, or already in the past.
 *
 * @param {string|number|null|undefined} value
 * @returns {number|null} milliseconds, or null when not parseable
 */
export function parseRetryAfterMs(value) {
  if (value == null) return null
  if (typeof value === 'string' && value.trim() === '') return null
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000)
  const dateMs = Date.parse(value)
  if (Number.isFinite(dateMs)) {
    const delta = dateMs - Date.now()
    return delta > 0 ? delta : null
  }
  return null
}

/**
 * 📖 extractRetryAfterFromResponse: Best-effort Retry-After extraction.
 * 📖 Tries the header first (RFC 7231), then falls back to the OpenRouter-style
 * 📖 error body "Rate limit exceeded, please try again N seconds later.".
 * 📖 Returns the delay in milliseconds, or 0 if no signal is found.
 *
 * @param {Response} resp — A Fetch Response object (uses .headers + .clone()/.text()).
 * @returns {Promise<number>}
 */
export async function extractRetryAfterFromResponse(resp) {
  if (!resp || typeof resp.headers?.get !== 'function') return 0

  // 1) Standard Retry-After header (lowercase lookup matches Headers semantics)
  const headerMs = parseRetryAfterMs(resp.headers.get('retry-after'))
  if (headerMs && headerMs > 0) return headerMs

  // 2) OpenRouter-style message body, e.g.: "Rate limit exceeded, please try again 50680 seconds later."
  try {
    const text = await resp.clone().text()
    if (!text) return 0
    const m = text.match(/try again (\d+)\s*seconds? later/i)
    if (m) {
      const secs = parseInt(m[1], 10)
      if (Number.isFinite(secs) && secs > 0) return secs * 1000
    }
  } catch {
    // Body unreadable — treat as no signal, don't throw.
  }
  return 0
}

// ─── Pause map API ────────────────────────────────────────────────────────────

/**
 * 📖 isProviderQuotaPaused: Return true while the provider's quota pause is active.
 * 📖 Lazily purges expired pauses so the map stays bounded over long sessions.
 *
 * @param {string} providerKey
 * @param {number} [now=Date.now()]
 * @returns {boolean}
 */
export function isProviderQuotaPaused(providerKey, now = Date.now()) {
  const until = providerQuotaPausedUntil.get(providerKey)
  if (until == null) return false
  if (now >= until) {
    providerQuotaPausedUntil.delete(providerKey)
    return false
  }
  return true
}

/**
 * 📖 pauseProviderQuota: Mark a provider as paused for `ms` milliseconds.
 * 📖 If already paused, keeps the longer of the existing and new windows (never shortens).
 *
 * @param {string} providerKey
 * @param {number} ms — Duration in milliseconds. Non-positive values are ignored.
 * @returns {boolean} true if the pause was applied or extended, false otherwise.
 */
export function pauseProviderQuota(providerKey, ms, opts = {}) {
  if (!providerKey || typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return false
  const now = opts.now ?? Date.now()
  const until = now + ms
  const cur = providerQuotaPausedUntil.get(providerKey) ?? 0
  // 📖 Keep the max so a 5s pause arriving after a 14h pause never shortens it.
  if (until > cur) providerQuotaPausedUntil.set(providerKey, until)
  return true
}

/**
 * 📖 providerQuotaPauseRemaining: How many ms remain on the current pause.
 * 📖 Returns 0 when the pause has expired or the provider is not paused.
 *
 * @param {string} providerKey
 * @param {number} [now=Date.now()]
 * @returns {number} milliseconds remaining (always >= 0)
 */
export function providerQuotaPauseRemaining(providerKey, now = Date.now()) {
  const until = providerQuotaPausedUntil.get(providerKey)
  if (!until) return 0
  const remaining = until - now
  if (remaining <= 0) {
    providerQuotaPausedUntil.delete(providerKey)
    return 0
  }
  return remaining
}

/**
 * 📖 listPausedProviders: Snapshot of currently paused providers + ms remaining.
 * 📖 Intended for diagnostics (TUI footer chip, daemon /stats, error logs).
 *
 * @param {number} [now=Date.now()]
 * @returns {Record<string, number>} {[providerKey]: msRemaining}
 */
export function listPausedProviders(now = Date.now()) {
  const out = {}
  for (const [providerKey, until] of providerQuotaPausedUntil) {
    const remaining = until - now
    if (remaining > 0) out[providerKey] = remaining
  }
  return out
}

/**
 * 📖 clearProviderQuotaPause: Force-reset the pause for a provider (or all).
 * 📖 Mainly a test/escape hatch — production code should let pauses expire naturally.
 *
 * @param {string} [providerKey] — omit to clear all pauses
 * @returns {void}
 */
export function clearProviderQuotaPause(providerKey) {
  if (!providerKey) {
    providerQuotaPausedUntil.clear()
    return
  }
  providerQuotaPausedUntil.delete(providerKey)
}
