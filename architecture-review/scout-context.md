# Scout Context — free-coding-models (codebase-design lens)

**Generated:** 2026-07-27
**Repo:** `/Users/vava/Documents/GitHub/free-coding-models`
**Version:** 0.5.63 (`package.json`)
**Scope:** Recon for downstream planning under `codebase-design` vocabulary (deep modules, seams, adapters, leverage, locality, deletion test).

---

## 1. Project in one paragraph

`free-coding-models` (FCM) is a Node.js CLI/Tool that **pings every free coding LLM** the maintainer can find (NVIDIA NIM, Groq, Cerebras, OpenRouter, GitHub Models, Mistral, Cloudflare, Scaleway, Z.AI, etc.), measures real-time latency + reliability, and **launches** your selected model into the AI coding assistant of choice (OpenCode CLI/Desktop, OpenClaw, Crush, Goose, Aider, Pi, Hermes, Continue, Cline, ForgeCode, OpenHands, Amp, etc.). It is shipped as **three surfaces** that all share one core:

1. **TUI CLI** (raw ANSI + chalk + readline) — `bin/free-coding-models.js`
2. **Web Dashboard** (React + Vite + Socket.IO, served by the same Node binary when `--web`) — `web/`
3. **Desktop (Tauri)** — `desktop/`, sidecar to the same Node binary

A long-lived **router daemon** (`src/core/router-daemon.js`) exposes an OpenAI-compatible endpoint at `http://localhost:19280/v1` that any coding tool can point at; FCM picks the healthiest model in the active set on every request.

The **core claim to design leverage** is: `src/core/` (46 files, ~21.5 kloc) is the single brain that all three surfaces reuse. AGENTS.md enforces this as a hard rule (Cross-Surface Compatibility Mandate).

---

## 2. Top-level module map (the deep modules worth naming)

These are the **deep modules** — small interface, big behaviour, central leverage for everything else.

### 2.1 `src/core/utils.js` — **the verdict brain** (956 lines, pure)
- **Interface:** `getAvg`, `getVerdict`, `getUptime`, `getP95`, `getJitter`, `getStabilityScore`, `sortResults`, `filterByTier`, `findBestModel`, `parseArgs`, `scoreModelForTask`, `getTopRecommendations`, `formatResultsAsJSON`, plus constants (`TIER_ORDER`, `VERDICT_ORDER`, `TIER_LETTER_MAP`, `TASK_TYPES`, `PRIORITY_TYPES`, `CONTEXT_BUDGETS`).
- **Behaviour:** Every numeric/decision logic a ping row needs (avg, p95, jitter, stability composite, verdict ladder, smart-recommend scoring, CLI parsing, JSON output). This is the single most-tested module (`test/test.js` + 11 other suites).
- **Leverage:** Every surface (TUI table column, web payload builder, router dashboard, `--json`, `--fiable`) consumes this. The Smart Recommend scoring (`scoreModelForTask`) is one composite weighted function reused for the `Q` overlay and `findBestModel`.
- **Locality:** Changing "what does Perfect mean?" is a one-file edit.
- **Per the deletion test:** deleting this file forces the verdict/avg/p95 logic to be re-implemented in 3+ surfaces → it earns its keep.

### 2.2 `sources.js` — **the model catalog** (32.8 kB, data, root-level)
- **Interface:** Two exports: `sources` (object keyed by `providerKey`, each `{ name, baseUrl, models }`) and `MODELS` (flat `[modelId, label, tier, sweScore, ctx, providerKey]` tuple array).
- **Behaviour:** Single source of truth for ~238 models across ~13 providers. Tuple shape is an unwritten contract that the whole app depends on.
- **Gotcha:** Many modules destructure tuples positionally (e.g. `for (const [modelId, label, tier, sweScore, ctx, providerKey] of models)`). The `addedDate` (6th element) is optional and used by `isNewModel`.
- **Leverage:** Add a provider once → all three surfaces see it instantly. The audit skill (`update_models`) exists to keep this in sync with `models.dev`.

### 2.3 `src/core/router-daemon.js` — **the smart router god module** (3834 lines, god-file)
- **Interface:** `runRouterDaemon`, `startRouterDaemonBackground`, `stopRouterDaemon`, `getRouterDaemonStatus`, `buildDefaultRouterSet`, `formatOpenAiError`, `createRouterRuntimeForTest`, plus exported port/path constants.
- **Behaviour:** Single file contains HTTP server, SSE broadcasting, web API payload builders (`getWebModelsPayload`, `getWebStatePayload`, `getWebConfigPayload`), static file serving, security checks (loopback/private-network), `RouterRuntime` class, `RouterLogger`, `TokenTracker`, circuit breaker, auto-heal, daemon lifecycle, default set builder.
- **Status:** Already on the backlog — task `t-split-router-daemon.md` plans the exact split (logger / token-tracker / payloads / server / circuit-breaker / lifecycle).
- **Locality is broken:** changing the payload shape touches one of three different inner classes depending on which path you took.

### 2.4 `src/tui/key-handler.js` — **the TUI keypress god module** (3594 lines, god-file)
- **Interface:** One factory: `createKeyHandler(state)` returning an async keypress handler.
- **Behaviour:** Every key for the main table + every overlay (settings P, command palette Ctrl-P, install-endpoints, recommend Q, changelog I, router dashboard, playground, tool launch dispatch).
- **Status:** Already on the backlog — task `t-split-key-handler.md` plans the split (`key-settings.js`, `key-install.js`, `key-recommend.js`, `key-playground.js`).
- **Locality is broken:** adding a new overlay key requires editing a 3.5k-line switch.

### 2.5 `src/core/config.js` — **the persistence module** (1193 lines)
- **Interface:** `loadConfig`, `saveConfig`, `getApiKey`, `addApiKey`, `removeApiKey`, `listApiKeys`, `isProviderEnabled`, `normalizeRouterConfig`, `normalizeEndpointInstalls`, `persistApiKeysForProvider`, `CONFIG_PATH`.
- **Behaviour:** Owns `~/.free-coding-models.json` (0600). Handles atomic write + merge safeguards, multi-key per provider, profiles (legacy — being removed per `parseArgs` comment), endpoint install tracking, router config normalization, plain-text → JSON migration.
- **Leverage:** Every surface reads API keys + provider enabled state through this. The "profile system removed" comment in `parseArgs` is stale documentation that hasn't been removed yet (gotcha).

### 2.6 `src/core/ping.js` (176 lines) + `src/core/ping-loop.js` + `src/core/probe-cache.js` (514 lines)
- **Interface:** `ping()`, `buildPingRequest`, `buildChatCompletionPingBody`, `markDisabledThinkingUnsupported`, `shouldUseDisabledThinkingForProvider`, `resolveCloudflareUrl`, `usagePlaceholderForProvider`, `extractQuotaPercent`. Probe cache: `loadCache`, `flushCache`, `clearCache`, `getModelsDueForProbe`, `recordProbeResults`, `isCacheFresh`, `getCacheStats`.
- **Behaviour:** HTTP probes with thinking-disabled workaround, quota extraction from rate-limit headers, persistent 24h probe cache shared across CLI + daemon + Tauri.
- **Seam location:** `probe-cache.js` already has the cleanest external seam of the codebase — file-on-disk + versioned schema + atomic write + TTL. This is the **good** shape to imitate.
- **Locality:** Adding a new provider endpoint = edit one function in `ping.js`. Adding a quota header variant = edit `extractQuotaPercent`.

### 2.7 `src/core/router-dashboard.js` (1095 lines) — **TUI dashboard client**
- **Interface:** `openRouterDashboardOverlay`, `closeRouterDashboardOverlay`, `refreshRouterDashboardSnapshot`, `startRouterDashboardEventStream`, `cycleRouterDashboardActiveSet`, `cycleRouterDashboardProbeMode`, `renderRouterDashboard`, `normalizeRouterDashboardSnapshot`, `parseRouterDashboardSseFrame`, plus set-mutation helpers (`fetchRouterSets`, `createRouterSet`, `renameRouterSet`, `duplicateRouterSet`, `deleteRouterSet`, `activateRouterSet`, `updateRouterSetModels`, `addModelToRouterSet`, `removeModelFromRouterSet`, `reorderRouterSetModel`).
- **Behaviour:** Polling + SSE client, defensive parsing of daemon payloads (handles stopped/stale/malformed), renders the in-TUI Smart Router Dashboard overlay.
- **Leverage:** Reuses `getAvg`/`getVerdict` from `utils.js` — its rows are computed by the same brain as the main TUI table.

### 2.8 `src/core/tool-launchers.js` (1145 lines) — **external tool adapter fan-out**
- **Interface:** `resolveLauncherModelId`, `buildToolEnv`, `prepareExternalToolLaunch`, `startExternalTool`.
- **Behaviour:** For each supported external tool (Goose, Crush, Pi, Aider, Hermes, Continue, Cline, ForgeCode, etc.) it writes a managed config file in the tool's expected location, exports OpenAI-compat env vars, and spawns the tool.
- **Pattern (the *right* kind of seam):** Each tool has a stable config shape, and `prepareExternalToolLaunch` returns a `{ command, env }` it doesn't spawn. That's a return-results-don't-side-effect shape — testable.

### 2.9 `src/core/telemetry.js` (401 lines) — **fire-and-forget PostHog + Discord webhooks**
- **Interface:** `sendUsageTelemetry`, `sendFeatureRequest`, `sendBugReport`, `isTelemetryEnabled`, `getTelemetryDistinctId`, `ensureTelemetryConfig`, plus `parseTelemetryEnv`, `isTelemetryDebugEnabled`, `telemetryDebug`.
- **Behaviour:** 1.2 s hard timeout, opt-in-by-default, anonymous stable ID stored in config.
- **Note:** Imported by both TUI, web dashboard, and daemon — true cross-surface leverage.

---

## 3. Seams — where the boundaries actually live

Per the codebase-design vocabulary: a **seam** is where a module's interface lives. Putting it in the right place is the design decision.

### 3.1 Cross-surface seams (the load-bearing ones)

| Seam | Location | Notes |
|---|---|---|
| **Config persistence** | `src/core/config.js` ←→ `~/.free-coding-models.json` | 0600 perms, atomic write, shared by all 3 surfaces. The single piece of state every surface agrees on. |
| **Probe cache** | `src/core/probe-cache.js` ←→ `~/.free-coding-models/probe-cache.json` | Versioned schema (`CURRENT_PROBE_VERSION = 2`), 24h TTL, atomic write. Cleanest seam in the codebase. |
| **Runtime telemetry** | `src/core/runtime-telemetry.js` ←→ `~/.free-coding-models/runtime-telemetry.json` | Per-model call counts + tokens, used by daemon for "real-world score". |
| **Daemon IPC** | `src/core/router-daemon.js` ←→ `~/.free-coding-models-daemon.{pid,port,log}` + `http://localhost:19280/v1` | Dynamic port range (19280–19289 prod, 29280–29289 dev). PID file + `/health` for discovery. |
| **OpenAI-compatible endpoint** | `http://localhost:19280/v1` (HTTP) | Any external tool can target it; daemon does the failover. |
| **Catalog** | `sources.js` (root) | All three surfaces read from this one file. Adding a provider is a one-line edit. |
| **Telemetry** | `src/core/telemetry.js` ←→ PostHog + Discord | Hard 1.2 s timeout so it never blocks startup. |

### 3.2 Internal seams (inside router-daemon — god module territory)

Inside `src/core/router-daemon.js` the following **logical** modules coexist in one file. They are not yet real seams because they share a closure and don't cross a module boundary, but task `t-split-router-daemon.md` plans to make them real ones:

- `RouterRuntime` — request handling, model selection, probe cache reads, quota recording, runtime telemetry writes, circuit breaker state
- `RouterLogger` — request log, SSE broadcast
- `TokenTracker` — token count aggregation
- `RouterLogger` (the circuit one) + circuit breaker + auto-heal
- Default-set builder (`buildDefaultRouterSet`)
- Web payload builders (`getWebModelsPayload`, `getWebStatePayload`, `getWebConfigPayload`)
- Static file serving (the bundled React app)
- Security checks (`isLoopbackHostname`, `isPrivateNetworkHostname`, `isSameOriginOrLocal`)
- Daemon lifecycle (`runRouterDaemon`, `startRouterDaemonBackground`, `stopRouterDaemon`, `getRouterDaemonStatus`)

### 3.3 Internal seams (inside key-handler — god module territory)

Same story in `src/tui/key-handler.js`:

- Main table navigation + sort hotkeys (R/O/M/L/A/S/C/H/V/B/U/G)
- Settings overlay (`P`)
- Command palette (Ctrl-P)
- Install-endpoints overlay
- Recommend / Smart Recommend flow (`Q`)
- Changelog overlay (`I`)
- Router dashboard overlay keys
- Playground overlay keys
- Tool launch dispatch (Enter → `startExternalTool`)

---

## 4. Adapters — the *role*, not the substance

| Slot | Real adapter | Notes |
|---|---|---|
| HTTP provider endpoint | Each entry in `sources.js` (`nvidia`, `groq`, `cerebras`, `openrouter`, `github-models`, `mistral`, `cloudflare`, `scaleway`, `googleai`, `zai`, etc.) | Adapter = one provider's URL + auth header scheme. |
| External coding tool | One launcher function inside `src/core/tool-launchers.js` per tool | Adapter = one tool's config-file shape + spawn contract. |
| Surface | `bin/free-coding-models.js` (TUI), `web/server.js` (React), `desktop/` (Tauri sidecar) | Three adapters sitting on top of one shared core. |
| TUI rendering | Raw ANSI + chalk in `src/tui/render-table.js`, `overlays.js` | Adapter = the visual layer; state lives in `src/tui/tui-state.js`. |
| Telemetry backend | PostHog for analytics, Discord webhooks for feedback (`I`/`J` keys) | Adapter = the network sink. |
| Probe cache | `~/.free-coding-models/probe-cache.json` (atomic JSON) | Adapter = the storage backend. |

---

## 5. Conventions — what the codebase actually does

- **ESM only** — `"type": "module"` in `package.json`, every import is `import`/`export`.
- **Node ≥18** — relies on native `fetch`, `crypto.randomUUID`, `node:test` test runner.
- **Zero runtime test deps** — tests use `node --test` + `node:assert`. Pure logic in `src/utils.js`; heavier logic has its own suite (`probe-cache.test.js`, `runtime-telemetry.test.js`, etc.).
- **Heavy commenting style** — every module starts with a JSDoc `@file`, `@description`, `@functions`, `@exports`, `@see` block, and most inline blocks are introduced with `📖 ` and explain **why**, not what.
- **Imports go up the tree, never sideways** — `src/core/*` never imports `src/tui/*`; TUI pulls from core. `web/` pulls from core.
- **Path constants over magic strings** — `CONFIG_PATH` from config.js, `ROUTER_DEFAULT_PORT` from router-daemon.js, `DEFAULT_PROBE_TTL_MS` from probe-cache.js.
- **Atomic writes** — every module that persists state uses `atomicWriteJson` from `src/core/shared-helpers.js` (tmp + rename). 0600 perms on secrets.
- **Versioned schemas** — probe cache has `CURRENT_PROBE_VERSION`; bumping silently re-probes everything (no manual purge).
- **Dev/prod isolation** — `process.env.FCM_DEV` flips port range, PID/log/token paths, and config dir. Git checkouts auto-detect dev mode in `bin/free-coding-models.js`.
- **Surfaces share state via files, not IPC** — daemon ↔ CLI ↔ Web ↔ Tauri all read/write the same `~/.free-coding-models*.json` files. No DB.

---

## 6. Dependencies — the relevant ones

| Dep | Why it matters |
|---|---|
| `chalk ^5.6.2` | The ONLY styling dep. TUI is raw ANSI + chalk. No blessed/ink — keeps the renderer trivial and shareable with the web dashboard's SSR. |
| `socket.io ^4.8.3` + `socket.io-client` | Web dashboard realtime layer. Daemon's SSE is custom (Node built-ins only) but the browser uses Socket.IO. |
| `@tanstack/react-table ^8.21.3` + `@tanstack/react-virtual ^3.14.2` + `@tabler/icons-react` | Web dashboard table — virtualized, no DOM bloat for ~238 rows. |
| `kandown ^0.34.3` | Used as a CLI in `.kandown/AGENT_KANDOWN.md` workflow. Not imported by the app. |
| `react ^19.2.7` + `react-dom` + `@vitejs/plugin-react` + `vite ^8.0.16` + `vite-plus ^0.2.6` | Web dashboard build chain. |
| **No ORM, no DB, no Tailwind, no test framework dep** | All intentional. The npm tarball is small and the install footprint stays low. |

`package.json` `files` field pins what gets published: `bin/`, `src/`, `scripts/check-drift.mjs`, `scripts/update-benchmarks.mjs`, `web/` (minus node_modules), `sources.js`, `patch-openclaw.js`, `patch-openclaw-models.js`, `README.md`, `LICENSE`, `changelog/`. **Anything outside this set will fail at npm install** — gotcha.

---

## 7. Tests — what's tested, where, and how

Test command (from `package.json`):
```
pnpm test → node --test test/test.js test/fcm-agent-core.test.js test/patch-openclaw.test.js test/provider-metadata.test.js test/config-permission-hint.test.js test/probe-cache.test.js test/passive-quota.test.js test/runtime-telemetry.test.js test/extended-benchmarks.test.js test/models-dev.test.js test/model-merger.test.js
```

AGENTS.md says **62 tests across 11 suites**. Actual `test/` listing (16 files) suggests more now; some may have grown. Pure logic lives in `src/core/utils.js`; heavier logic gets its own suite. The pattern is **one file per concern**.

Gotcha: `test/test.js` is the canonical suite but specific concerns are split out — when adding a new test surface, **match the existing split** (don't pile everything into `test.js`).

---

## 8. Gotchas & sharp edges

1. **Two god modules exist and are tracked for splitting** — `src/core/router-daemon.js` (3834 lines) and `src/tui/key-handler.js` (3594 lines). Any design work should respect the existing backlog tasks (`t-split-router-daemon.md`, `t-split-key-handler.md`) instead of inventing parallel refactors.
2. **`getVerdict` benchmark branch is a 30-line parallel ladder** — duplicated logic in `src/core/utils.js`. Tracked by `t-dedup-getVerdict.md`. If touching verdict logic, address this in the same change.
3. **Tuple-shape coupling to `sources.js`** — many modules destructure `[modelId, label, tier, sweScore, ctx, providerKey]`. Adding a 7th element breaks every loop. The safe upgrade path is named fields, but that's a non-trivial refactor.
4. **Stale comments** — `parseArgs` in `utils.js` mentions a "profile system" that was removed. The JSDoc still says things like "API keys now persist permanently across all sessions" — confirm by reading the code, not the comment.
5. **`getApiKey` env-var shadowing** — config-vs-env precedence is critical; many users hit silent bugs when their env var doesn't match what the config expects. The fallback order (env > config > null) lives in `config.js`.
6. **`bin/` entry must set `FCM_DEV` BEFORE any import** — `bin/free-coding-models.js` checks `.git` existence and `--dev` synchronously at the top. If you add a new entry surface or move imports, this contract must hold or daemon/dev-mode paths break.
7. **`pnpm-lock.yaml` is not in the package** — the published npm tarball depends on `package.json` only; lockfile state diverges between npm and pnpm users. The CI tests against the published npm tarball (`npm install -g free-coding-models@X.Y.Z`) per AGENTS.md.
8. **Cross-Surface Mandate is hard-coded** — every new feature must work in TUI + Web + Desktop. Any new file or surface needs to be wired into the other two. The `t-router-help-2026-06-02` task is an example of a feature that's been careful about this.
9. **The published `files` whitelist** — `package.json > files` is the single source of truth for what npm users get. Adding a file outside that list breaks installs silently.
10. **Probe cache concurrency** — daemon + CLI both read/write `probe-cache.json`. Handled via read-merge-write on every flush + atomic rename. Don't introduce a process-local cache (gotcha for "speed up" PRs).
11. **`router-daemon.js` exports eagerly compute dev/prod paths** (`ROUTER_PID_PATH`, etc. as `const`). But `_isDev()` is a function — that's intentional, and the JSDoc explains why (TUI may flip `FCM_DEV` after module load). Don't "simplify" the constants into `_isDev()`-based expressions.
12. **Audit state lives in `audit_state.json`** at repo root — driven by the `update_models` skill. If you touch `sources.js`, run the audit skill afterwards.

---

## 9. Existing refactor tasks (the live backlog the design work should feed)

Pulled from `.kandown/tasks/`:

| ID | Status | Title | Why it matters |
|---|---|---|---|
| `t-split-router-daemon` | Backlog | Split router-daemon.js (3500-line God file) into focused modules | The biggest seam-recovery project. Plan: extract `RouterLogger`, `TokenTracker`, `router-payloads`, `router-server`, `router-circuit`; keep lifecycle in a thin `router-daemon.js`. |
| `t-split-key-handler` | Backlog | Split key-handler.js (3700-line God file) into focused modules | Plan: `key-settings.js`, `key-install.js`, `key-recommend.js`, `key-playground.js`; keep table nav + launch dispatch in `key-handler.js`. |
| `t-dedup-getVerdict` | Backlog | Deduplicate getVerdict benchmark branch in utils.js | Extract a threshold→verdict helper; preserve the TPS-based upgrades unique to benchmark branch. |
| `t-router-help-2026-06-02` | Todo | Human-friendly router health labels + How-it-works help | Translate `CLOSED`/`OPEN`/`HALF_OPEN`/`AUTH_ERROR`/`STALE` into plain words in dashboard UI + Web Help modal. |
| `t1`, `t2`, `t0` | — | Probe-cache + passive-quota + runtime-telemetry phases (already shipped) | Historical context for how the seam pattern evolved. |

These are **the natural targets** for any deep-module design pass.

---

## 10. What "deep module" would look like here

Concrete leverage opportunities the planner should consider (no decisions made — just surfaces):

- **`getVerdict(r)` as the canonical verdict brain.** Currently the benchmark branch duplicates the ping branch. A single `(latency, p95, measurableCount) → verdict` function would let the daemon, web dashboard, and TUI agree on what "Perfect" means everywhere. This is what `t-dedup-getVerdict.md` is hinting at — make it a clean module instead of two parallel ladders.
- **`RouterRuntime` as its own seam.** Currently it lives inside `router-daemon.js` and shares a closure with everything else. Pulling it out (per `t-split-router-daemon.md`) creates an external seam — every surface (TUI dashboard, web dashboard, CLI) can construct a runtime and ask "which model would you route to?" without spawning the HTTP server.
- **One `selectRoute(request, runtime)` function.** Right now route selection is buried inside `RouterRuntime.handleChatCompletion`. A pure function `(requestBody, runtime) → { provider, model, reason }` would be trivially testable, and the daemon, the playground, and the future "what-if" UI all consume it.
- **`probe-cache.js` as the template.** It's already a deep module — small interface (`loadCache`/`flushCache`/`getModelsDueForProbe`/`recordProbeResults`/`getCacheStats`), atomic JSON-on-disk adapter at the seam, versioned schema. Other persistence seams could follow its shape.
- **`parseArgs` is already a deep module** — one function, ~120 lines, handles ~35 CLI flags with skip-index logic for value flags. Keep it that way; don't let it grow.

---

## 11. Files I read end-to-end while scouting

- `bin/free-coding-models.js` — entry point, mode dispatch, dev-mode detection
- `src/core/utils.js` (full) — verdict brain, parseArgs, scoring, JSON formatter
- `src/core/router-daemon.js` (head + key helpers + payload builder + security) — god module
- `src/core/router-dashboard.js` (head + helpers) — dashboard client
- `src/core/probe-cache.js` (head + path resolution) — seam template
- `src/core/model-merger.js` (head) — catalog merge + extended benchmark overlay
- `src/core/config.js` (head + signatures) — persistence + migration
- `src/core/ping.js` (head) — HTTP probe + thinking-disabled workaround
- `src/core/tool-launchers.js` (head) — external tool adapter fan-out
- `src/core/telemetry.js` (head) — fire-and-forget PostHog + Discord
- `src/tui/app.js` (head) — TUI orchestrator
- `src/tui/key-handler.js` (head + factory entry) — keypress god module
- `package.json` — deps + `files` whitelist + scripts
- `AGENTS.md` (project) — cross-surface mandate + testing/release process
- `.kandown/tasks/*` — live backlog

## 12. Files I skimmed but didn't read in full

- The remaining ~36 files in `src/core/` (single-file passes via `wc -l` + headers)
- The remaining ~11 files in `src/tui/` (same)
- `web/server.js` (80 kB — the Express + Socket.IO + bundled React app server)
- `desktop/prd-desktop.md` (Tauri product requirements)
- `sources.js` (32 kB catalog — large but well-structured)
- `changelog/` (243 entries — only the most recent few for context)

---

**Scout done.** Path: `/Users/vava/Documents/GitHub/free-coding-models/.pi/plans/2026-07-27-codebase-design/scout-context.md`
