/**
 * @file pi-progress-renderer.js
 * @description Pi status-bar renderer + live model widget for FCM scan progress events.
 *
 * @details
 *   The shared core emits structured progress events; this module owns all
 *   Pi-specific presentation during a scan. It handles two surfaces:
 *
 *   **Status bar** (`ctx.ui.setStatus`):
 *     A spinner with phase label and progress counter, always visible during the scan.
 *     Uses the FCM brand badge colours (matching the main TUI header logo).
 *
 *   **Live model widget** (`ctx.ui.setWidget`):
 *     A dynamic table that shows models as they are discovered — one row per
 *     ping result, updated in place as benchmarks finish. Rows appear immediately
 *     after each ping completes (phase: 'model-result') and are enhanced with
 *     TPS data once benchmarking is done (phase: 'benchmark-result').
 *     The widget uses `🟢`/`🔴` emoji so it reads well in Pi's monospace UI.
 *
 *   One renderer = one scan lifecycle. `start()` begins the 80ms spinner
 *   animation, `update(event)` is fed by the core's `onProgress`, and `stop()`
 *   clears the status bar (widget stays visible after the scan so the user can
 *   read the results before picking).
 *
 * @functions
 *   - createPiStatusRenderer → Build { start, update, stop } for one scan lifecycle
 */

import chalk from 'chalk'

// 📖 Brand logo colours — mirror the main FCM TUI header (dark theme palette)
// 📖 so the footer badge looks identical to the `> free-coding-models_` header.
const HEADER_BG = [0, 0, 0]
const HEADER_GREEN = [118, 185, 0]
const HEADER_WHITE = [255, 255, 255]

const hBold = (color, text) => chalk.rgb(...color).bgRgb(...HEADER_BG).bold(text)

// 📖 Pre-built brand badge: `> free-coding-models` (green > free, white -coding-models)
const BADGE = `${hBold(HEADER_GREEN, '> ')}${hBold(HEADER_GREEN, 'free')}${hBold(HEADER_WHITE, '-coding-models')}`

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const DEFAULT_INTERVAL_MS = 80

// 📖 Widget name used for the live model table in Pi's sidebar/widget panel.
const LIVE_WIDGET_ID = 'fcm-live-scan'

/**
 * 📖 Format a single model row for the live scan widget table.
 * 📖 Status emoji: 🟢 = up, ⚡ = up+benchmarked, 🔴 = down/timeout, ⏱ = probing.
 *
 * @param {object} model - Scanned model record
 * @param {number} rank - 1-based rank index
 * @param {boolean} benchmarked - Whether AI benchmark result is available
 * @returns {string} Formatted row line
 */
function formatLiveModelRow(model, rank, benchmarked = false) {
  let statusIcon
  if (model.status === 'up') {
    statusIcon = benchmarked ? '⚡' : '🟢'
  } else if (model.status === 'timeout') {
    statusIcon = '⏱'
  } else {
    statusIcon = '🔴'
  }

  const num = String(rank).padStart(2)
  const name = (model.label || model.modelId).padEnd(24).slice(0, 24)
  const tier = (model.tier || '?').padEnd(3).slice(0, 3)
  const swe = (model.sweScore || '-').padStart(5)
  const lat = model.latencyMs ? `${model.latencyMs}ms`.padStart(7) : '    n/a'
  const tps = model.tps ? `${Math.round(model.tps)} TPS` : benchmarked ? 'FAIL' : '    —'
  const prov = (model.providerName || model.providerKey || '').padEnd(9).slice(0, 9)

  return `${statusIcon} ${num}. ${name} ${tier} ${swe} ${lat}  ${tps.padStart(7)}  ${prov}`
}

/**
 * 📖 Build the full live widget content from the accumulated model map.
 *
 * @param {Map<string, object>} modelMap - Map of modelId → model record
 * @param {Set<string>} benchmarkedIds - Set of modelIds that have finished benchmarking
 * @param {boolean} scanDone - Whether the full scan is complete
 * @returns {string[]} Lines for Pi's setWidget call
 */
function buildLiveWidget(modelMap, benchmarkedIds, scanDone) {
  const models = [...modelMap.values()]

  // 📖 Sort: up models first (by latency), then down/timeout
  const sorted = models.sort((a, b) => {
    const aUp = a.status === 'up' ? 0 : 1
    const bUp = b.status === 'up' ? 0 : 1
    if (aUp !== bUp) return aUp - bUp
    return (a.latencyMs ?? Infinity) - (b.latencyMs ?? Infinity)
  })

  const header = scanDone
    ? '── FCM Scan Complete ─────────────────────────────────────────'
    : '── FCM Scan in Progress… ─────────────────────────────────────'

  const colHeader = '    #   Model                    Tier   SWE   Latency      TPS   Provider'
  const separator = '  ─────────────────────────────────────────────────────────────────────'

  const lines = [header, colHeader, separator]

  let rank = 0
  for (const model of sorted.slice(0, 20)) {
    rank++
    const benchmarked = benchmarkedIds.has(model.modelId)
    lines.push(formatLiveModelRow(model, rank, benchmarked))
  }

  if (models.length === 0) {
    lines.push('  Scanning… models will appear here as they respond.')
  }

  const upCount = models.filter(m => m.status === 'up').length
  lines.push(separator)
  lines.push(`  🟢 ${upCount} reachable  |  ${models.length} probed  |  ⚡ benchmarked`)

  return lines
}

/**
 * 📖 Build a Pi status renderer for one scan lifecycle.
 *
 * 📖 Handles both the status-bar spinner and the live model table widget.
 * 📖 The widget accumulates models as they come in from `model-result` events
 * 📖 and updates their rows when `benchmark-result` events arrive.
 *
 * @param {object} options
 * @param {function} options.setStatus - Pi `ctx.ui.setStatus('fcm', string|undefined)`
 * @param {function} [options.setWidget] - Pi `ctx.ui.setWidget(id, lines[])` — optional; enables live table
 * @param {number} [options.intervalMs=80] - Spinner animation refresh rate
 * @returns {{ start: Function, update: Function, stop: Function }}
 */
export function createPiStatusRenderer({ setStatus, setWidget, intervalMs = DEFAULT_INTERVAL_MS }) {
  const safeSetStatus = typeof setStatus === 'function' ? setStatus : () => {}
  const safeSetWidget = typeof setWidget === 'function' ? setWidget : null

  let frame = 0
  let latest = null
  let timer = null

  // 📖 Accumulated scan state for the live widget
  const modelMap = new Map()       // modelId → latest model record
  const benchmarkedIds = new Set() // modelIds that have a benchmark result
  let scanDone = false

  const render = () => {
    const spinner = chalk.bold.magenta(SPINNER_FRAMES[frame])
    const ev = latest || { phase: 'idle' }

    let line
    if (ev.phase === 'probing' || ev.phase === 'benchmarking') {
      const action = chalk.bold.yellow(`${ev.action || (ev.phase === 'probing' ? 'Probing' : 'Benchmarking')}:`)
      const pctStr = chalk.bold.cyan(`${ev.percent ?? 0}%`)
      const counterStr = chalk.gray(`(${ev.completed ?? 0}/${ev.total ?? 0})`)
      line = `${spinner} ${action} ${BADGE} — ${pctStr} ${counterStr}`
    } else if (ev.phase === 'error') {
      line = `${spinner} ${chalk.red(ev.message || 'FCM scan error')}`
    } else if (ev.phase === 'done') {
      // 📖 Done is rendered briefly then cleared by stop(); keep a quiet line.
      line = `${spinner} ${chalk.dim('FCM scan complete')}`
    } else if (ev.message) {
      // 📖 daemon-check and other plain-message phases
      line = `${spinner} ${ev.message}`
    } else {
      line = `${spinner} ${chalk.gray('FCM…')}`
    }

    safeSetStatus(line)
  }

  const renderWidget = () => {
    if (!safeSetWidget) return
    const lines = buildLiveWidget(modelMap, benchmarkedIds, scanDone)
    safeSetWidget(LIVE_WIDGET_ID, lines)
  }

  return {
    start() {
      if (timer) return
      timer = setInterval(() => {
        frame = (frame + 1) % SPINNER_FRAMES.length
        render()
      }, intervalMs)
      render()
    },

    update(event) {
      if (!event) return

      // 📖 Handle live model ping result — add/update the model in the live table
      if (event.phase === 'model-result' && event.model) {
        const m = event.model
        modelMap.set(m.modelId, m)
        renderWidget()
        return // 📖 Don't update status bar for individual model results
      }

      // 📖 Handle benchmark result — update the model's TPS + mark benchmarked
      if (event.phase === 'benchmark-result' && event.model) {
        const m = event.model
        modelMap.set(m.modelId, m)
        benchmarkedIds.add(m.modelId)
        renderWidget()
        return
      }

      // 📖 Handle scan done
      if (event.phase === 'done') {
        scanDone = true
        renderWidget()
      }

      latest = event
      render()
    },

    stop() {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      latest = null
      try {
        safeSetStatus(undefined)
      } catch (err) {
        // 📖 UI cleanup must never break the agent lifecycle.
      }
      // 📖 Intentionally do NOT clear the widget here — the user needs to read
      // 📖 the results before the /fcm picker appears.
    }
  }
}
