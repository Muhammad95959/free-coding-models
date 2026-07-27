---
id: t-split-router-daemon
title: Split router-daemon.js (3500-line God file) into focused modules
status: Backlog
ownerType: ai
tools: filesystem, cli
---

# Split router-daemon.js into focused modules

## Context

`src/core/router-daemon.js` is 3500 lines and contains: HTTP server, SSE broadcasting, web API payload builders, static file serving, security checks, RouterRuntime class, RouterLogger, TokenTracker, circuit breaker, auto-heal, daemon lifecycle, default set builder. All in one file makes it hard to navigate and maintain.

## Subtasks

- [ ] Extract `RouterLogger` class into `src/core/router-logger.js`
- [ ] Extract `TokenTracker` class into `src/core/token-tracker.js`
- [ ] Extract web API payload builders (`getWebModelsPayload`, `getWebStatePayload`, `getWebConfigPayload`) into `src/core/router-payloads.js`
- [ ] Extract static file serving + security checks into `src/core/router-server.js`
- [ ] Extract circuit breaker + auto-heal logic from `RouterRuntime` into `src/core/router-circuit.js`
- [ ] Keep daemon lifecycle (start/stop/status) in `router-daemon.js` as thin orchestrator
- [ ] Run `pnpm test` (521 tests must pass)
- [ ] Test TUI with tmux — verify router dashboard, playground, daemon start/stop all work
- [ ] Verify web dashboard at localhost:19280 works

## Notes

- Pure refactoring — no behavior changes
- Each extracted module should export its class/functions
- `router-daemon.js` imports and wires them together
- Net line count stays the same, but each file becomes navigable (~200-400 lines)
