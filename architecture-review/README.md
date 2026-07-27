# Architecture review

Visual + textual review of `free-coding-models` architecture, generated on 2026-07-27
using the `improve-codebase-architecture` skill (`/Users/vava/.agents/skills/improve-codebase-architecture`).

Vocabulary: **module · interface · implementation · depth · seam · adapter · leverage · locality**.

## 📂 Folder layout

| File / directory | What it is | When to open it |
|---|---|---|
| [`2026-07-27-architecture-review.html`](2026-07-27-architecture-review.html) | **The report.** Self-contained HTML with Tailwind + Mermaid via CDN. | Open in any modern browser (`open 2026-07-27-architecture-review.html`). |
| [`candidates.md`](candidates.md) | Plain-text summary of the four candidates (verdict, runtime, key-handler, route selection). | Skim without browser, grep, or paste into chat. |
| [`scout-context.md`](scout-context.md) | Full scout reconnaissance that fed the report. Module map, seams, adapters, conventions, gotchas, and live backlog. | Read first if you want context for the candidates. |
| [`raw-tasks/`](raw-tasks/) | The four `.kandown/tasks/*.md` files referenced by the candidates. | Cross-reference the live backlog the report points at. |

## 🌐 Opening the HTML report

The report is a single file. It pulls **Tailwind** and **Mermaid** from CDNs at load time, so the browser needs internet on first open. After that it renders fully.

```bash
# macOS (default opener)
open architecture-review/2026-07-27-architecture-review.html

# Linux
xdg-open architecture-review/2026-07-27-architecture-review.html

# Windows
start architecture-review/2026-07-27-architecture-review.html
```

If you're offline, copy Tailwind and Mermaid into a `vendor/` subfolder and update the
two `<script>` tags in the HTML to point at the local copies.

## 🎯 TL;DR — the four candidates

1. **Deepen the verdict brain behind a single interface** — `Strong` — pure-logic, smallest win, four surfaces benefit.
2. **Deepen `RouterRuntime` as its own seam** — `Strong` — tracks `t-split-router-daemon.md` (3,834-line god file).
3. **Deepen the TUI session around small command modules** — `Worth exploring` — tracks `t-split-key-handler.md` (3,594-line god file).
4. **Deepen route selection as a pure function** — `Worth exploring` — `selectRoute(request, runtime) → { provider, model, reason }` for daemon, playground, and tests.

**Top recommendation:** start with the verdict brain. Pure logic, no behaviour change, and the god-module splits become safer once verdict semantics are stable in one place.

## ♻️ How this report was produced

- **Skill:** `improve-codebase-architecture` (with shared vocabulary from `codebase-design`).
- **Recon:** a `scout` sub-agent produced `scout-context.md` (12 sections, ~24 KB) under
  `.pi/plans/2026-07-27-codebase-design/`. It is copied here so the report is self-contained.
- **Synthesis:** the report is hand-written HTML in the skill's prescribed format (Tailwind via CDN,
  Mermaid via CDN, no other scripts). Diagrams are per-candidate before/after pairs.
- **Grilling loop:** after you pick a candidate, the `/grilling` skill walks the decision tree
  (constraints, dependencies, seam placement, what survives the test). Side effects land inline
  through `/domain-modeling` (add/clarify terms in `CONTEXT.md`; consider an ADR if a candidate is rejected
  with a load-bearing reason).

## 📌 Notes & gotchas

- **No `CONTEXT.md` / `docs/adr/` in this repo.** Domain terms come from `README.md`; if you want
  the report to use a richer glossary, create `CONTEXT.md` first and re-run.
- **Backlog already names the load-bearing seams.** The three `Strong` / `Worth exploring` candidates
  align with live `.kandown/tasks/` tasks — this report does not propose parallel refactors.
- **The HTML is intentionally not built at release time.** It is review material, not a shipped
  surface. Keep it under `architecture-review/` rather than wiring it into `package.json > files`.
- **Cross-Surface Mandate (AGENTS.md) still applies.** Any candidate, once implemented, must
  work on TUI + Web + Desktop before it ships.
