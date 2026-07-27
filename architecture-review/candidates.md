# Candidates — plain-text summary

Companion to [`2026-07-27-architecture-review.html`](2026-07-27-architecture-review.html).
Use this when you want to skim, grep, or paste into chat without opening a browser.

Vocabulary: **module · interface · implementation · depth · seam · adapter · leverage · locality**.

---

## Candidate 01 — Deepen the verdict brain behind a single interface

**Strength:** `Strong` · **Category:** mock (pure logic)

**Files**
- `src/core/utils.js`
- `src/tui/render-table.js`
- `src/core/router-dashboard.js`
- `web/src/hooks/useRouterDashboard.js`
- `test/test.js`

**Live backlog task**
- `.kandown/tasks/t-dedup-getVerdict.md`

**Problem.** `getVerdict` ships two near-identical ladders that disagree on what counts as
`Spiky` (3000 vs 5000). Every surface consumes the same verdict names through different code,
so a tweak has to be made twice and tested twice.

**Solution.** Extract a single `threshold → verdict` function. Let the TPS upgrades live as a
separate wrapper around it. One interface, one place to test.

**Benefits**
- **Locality:** threshold changes edit one place.
- **Leverage:** four surfaces agree on labels.
- **Tests** target the function, not the row.
- **TPS upgrades** stay unique to the benchmark path.

---

## Candidate 02 — Deepen `RouterRuntime` as its own seam

**Strength:** `Strong` · **Category:** ports & adapters

**Files**
- `src/core/router-daemon.js` (3,834 lines)
- `src/core/router-dashboard.js`
- `src/core/router-payloads` (proposed)
- `src/core/router-logger` (proposed)
- `src/core/token-tracker` (proposed)
- `src/core/router-circuit` (proposed)
- `src/core/router-server` (proposed)

**Live backlog task**
- `.kandown/tasks/t-split-router-daemon.md`

**Problem.** The runtime, the logger, the token tracker, the web payload builders, the static
server, and the security checks all live in one file and share one closure. Adding routing
policy or changing payload shape means navigating 3,834 lines.

**Solution.** Follow the tracked split plan: extract payload builders, logger, token tracker,
server, and circuit into focused modules. Promote `RouterRuntime` into its own deep seam.

**Benefits**
- **Locality:** routing policy has one home.
- **Leverage:** all surfaces share failover rules.
- **Tests** avoid booting the HTTP server.
- **Static delivery** stops touching policy.

---

## Candidate 03 — Deepen the TUI session around small command modules

**Strength:** `Worth exploring` · **Category:** in-process

**Files**
- `src/tui/key-handler.js` (3,594 lines)
- `src/tui/overlays.js`
- `src/tui/app.js`
- `src/tui/tui-state.js`
- `test/tui-hotkeys.test.js`

**Live backlog task**
- `.kandown/tasks/t-split-key-handler.md`

**Problem.** `createKeyHandler` receives a wide context object and one switch handles every
overlay. Adding a key requires reading the whole file to avoid shadowing existing bindings.

**Solution.** Mirror the existing overlay split in `overlays.js`: one file per concern. The
top-level handler delegates to focused modules keyed on `(state, ctx)`.

**Benefits**
- **Locality:** each overlay's key rules live together.
- **Leverage:** new overlays add one file, not 200 lines.
- **Tests** target the module, not the whole switch.
- **Table navigation** stays small and predictable.

---

## Candidate 04 — Deepen route selection as a pure function

**Strength:** `Worth exploring` · **Category:** mock

**Files**
- `src/core/router-daemon.js`
- `packages/fcm-agent-core/src/scan-orchestrator.js`
- `packages/fcm-agent-core/src/ranker.js`
- `test/test.js`

**Problem.** Routing policy is interleaved with HTTP streaming and side effects inside the
daemon handler. Hard to test, hard to reuse from the playground or the future "what-if" UI.

**Solution.** Pull route selection out into a pure function that takes a runtime snapshot and
returns a chosen candidate with a reason. Keep all I/O in adapters.

**Benefits**
- **Locality:** selection rules concentrate in one function.
- **Leverage:** daemon, playground, and tests share one selection.
- **Tests** use mock runtimes, no network.
- **Replays** become deterministic.

---

## Top recommendation

Start with the **verdict brain** (Candidate 01). Pure logic, no behaviour change, and four
surfaces benefit immediately. The two god-module candidates become safer to tackle once
verdict semantics are stable in one place.
