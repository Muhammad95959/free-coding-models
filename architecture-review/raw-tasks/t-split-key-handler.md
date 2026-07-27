---
id: t-split-key-handler
title: Split key-handler.js (3700-line God file) into focused modules
status: Backlog
ownerType: ai
tools: filesystem, cli
---

# Split key-handler.js into focused modules

## Context

`src/tui/key-handler.js` is 3709 lines handling every keypress for every overlay. All overlay interactions (settings, help, command palette, recommend, changelog, router dashboard, playground) go through one massive `onKeyPress` function.

## Subtasks

- [ ] Extract settings key handling into `src/tui/key-settings.js`
- [ ] Extract install-endpoints key handling into `src/tui/key-install.js`
- [ ] Extract recommend analysis flow into `src/tui/key-recommend.js`
- [ ] Extract playground key handling into `src/tui/key-playground.js`
- [ ] Keep main table navigation + tool launch dispatch in `key-handler.js`
- [ ] Run `pnpm test` (521 tests must pass)
- [ ] Test TUI with tmux — verify all key interactions work

## Notes

- Pure refactoring — no behavior changes
- Each overlay already has its own renderer in `overlays.js`; this split mirrors that for key handling
