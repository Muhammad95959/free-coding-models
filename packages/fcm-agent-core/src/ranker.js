/**
 * @file ranker.js
 * @description Composite ranking + scoring for free coding models (shared core).
 *
 * @details
 *   Scores models with a composite of five factors:
 *   - SWE-bench score (55%) — coding intelligence, primary signal
 *   - Latency (15%)        — lower ping = better
 *   - TPS (10%)            — generation throughput
 *   - Stability (10%)      — uptime health from daemon
 *   - Context window (10%) — rewards models that can hold long agent sessions
 *                            (normalized: 16k=0 → 128k=0.5 → 1M+=1.0)
 *
 *   Filters to reachable + keyed models, then sorts by score descending.
 *   Also exposes a plain-text menu formatter (no ANSI/chalk — adapters own colour rendering).
 *
 * @functions
 *   - parseSweScore → Turn '72.0%' / '-' into a number
 *   - computeCompositeScore → 0..1 score for one model
 *   - rankModels → Filter 'up'+keyed, score, sort
 *   - formatModelLine → Plain-text rank line for menus
 */

/**
 * 📖 Parse a SWE-bench percentage string into a float.
 *
 * @param {string} sweStr - SWE score (e.g., '72.0%' or '-')
 * @returns {number} Float representation of percentage (0 to 100)
 */
export function parseSweScore(sweStr) {
  if (!sweStr || sweStr === '-') return 0
  const cleaned = sweStr.replace('%', '').trim()
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * 📖 Normalize a context window size to a 0-1 score.
 * 📖 A 16k window (minimum usable) = ~0, 128k = ~0.5, 1M+ = 1.0.
 * 📖 Uses log scale so the jump from 16k→128k matters more than 512k→1M.
 *
 * @param {number} ctxTokens - Context window in tokens
 * @returns {number} Score from 0 to 1
 */
function normalizeContextWindow(ctxTokens) {
  // 📖 Log scale: log(16k)≈9.68, log(1M)≈13.82 — map to [0, 1]
  const MIN_LOG = Math.log(16_000)
  const MAX_LOG = Math.log(1_000_000)
  const val = Math.max(Math.min(ctxTokens, 1_000_000), 16_000)
  return (Math.log(val) - MIN_LOG) / (MAX_LOG - MIN_LOG)
}

/**
 * 📖 Compute a composite score (0-1) for a scanned model.
 *
 * 📖 Weights:
 * 📖   55% SWE-bench  — coding intelligence, the primary signal
 * 📖   15% Latency    — lower ping = higher score (max penalty at 15s)
 * 📖   10% TPS        — generation throughput (cap at 100 TPS)
 * 📖   10% Stability  — daemon health score (0-100)
 * 📖   10% Context    — log-normalized window size (16k→0, 1M→1)
 *
 * @param {object} model - The model record
 * @returns {number} Score from 0 to 1
 */
export function computeCompositeScore(model) {
  const sweWeight = 0.55
  const latWeight = 0.15
  const tpsWeight = 0.10
  const stabilityWeight = 0.10
  const ctxWeight = 0.10

  // 📖 Normalize SWE score (0-1)
  const sweVal = parseSweScore(model.sweScore)
  const sweNorm = sweVal / 100

  // 📖 Normalize Latency: lower latency is better. Max penalty reached at 15s.
  const latVal = typeof model.latencyMs === 'number' ? model.latencyMs : 15000
  const latNorm = 1 - Math.min(latVal / 15000, 1)

  // 📖 Normalize TPS (Tokens Per Second): cap at 100 TPS as a perfect score.
  const tpsVal = typeof model.tps === 'number' ? model.tps : 0
  const tpsNorm = Math.min(tpsVal / 100, 1)

  // 📖 Normalize Stability Score (0-100 from daemon/stats)
  const stabilityVal = typeof model.stabilityScore === 'number' ? model.stabilityScore : 100
  const stabilityNorm = stabilityVal / 100

  // 📖 Normalize Context Window — log scale so 128k vs 16k matters more than 512k vs 1M
  // 📖 Import parseContextWindow lazily to avoid circular dep — model has ctxWindow or ctx
  const rawCtx = model.ctxWindow ?? model.ctx
  let ctxNorm = 0.5 // 📖 Unknown context → neutral score
  if (rawCtx) {
    const parseCtx = (v) => {
      if (typeof v === 'number') return v
      const s = String(v).trim().toLowerCase()
      const mul = s.endsWith('m') ? 1_000_000 : s.endsWith('k') ? 1_000 : 1
      const n = parseFloat(s.replace(/[mk]$/i, ''))
      return isNaN(n) ? 0 : Math.round(n * mul)
    }
    const tokens = parseCtx(rawCtx)
    if (tokens > 0) ctxNorm = normalizeContextWindow(tokens)
  }

  return (sweWeight * sweNorm) +
         (latWeight * latNorm) +
         (tpsWeight * tpsNorm) +
         (stabilityWeight * stabilityNorm) +
         (ctxWeight * ctxNorm)
}

/**
 * 📖 Filter out unreachable models and sort by composite performance.
 *
 * @param {Array<object>} models - Scanned models list
 * @returns {Array<object>} Sorted list of models with computed composite scores
 */
export function rankModels(models) {
  return models
    .filter(m => m.status === 'up' && m.hasKey)
    .map(m => ({
      ...m,
      compositeScore: computeCompositeScore(m)
    }))
    .sort((a, b) => b.compositeScore - a.compositeScore)
}

/**
 * 📖 Format a single model line for menus (plain text; adapters add colour).
 *
 * @param {object} model - The ranked model
 * @param {number} rank - Index in the ranked list (1-based)
 * @returns {string} Plain-text model line
 */
export function formatModelLine(model, rank) {
  const medal = ['🥇', '🥈', '🥉'][rank - 1] || `${rank}.`
  const latStr = model.latencyMs ? `${model.latencyMs}ms` : 'n/a'
  const tpsStr = model.tps ? `, ${Math.round(model.tps)} TPS` : ''
  const sweStr = model.sweScore !== '-' ? ` (${model.sweScore} SWE)` : ''

  return `${medal} ${model.label} [${model.tier}]${sweStr} — ${latStr}${tpsStr} [${model.providerKey}]`
}
