---
id: t-dedup-getVerdict
title: Deduplicate getVerdict benchmark branch in utils.js
status: Backlog
ownerType: ai
tools: filesystem, cli
---

# Deduplicate getVerdict benchmark branch in utils.js

## Context

`src/core/utils.js` `getVerdict()` has a complete parallel verdict ladder for benchmark data that mostly duplicates the ping-based ladder (same thresholds, same verdict names). The benchmark branch checks `r.benchmark?.ok` first, then has nearly identical threshold logic with minor differences (3000→5000 for "Spiky" etc).

## Subtasks

- [ ] Extract the threshold→verdict mapping into a shared helper
- [ ] Call with either `avg` (ping) or `aiLatency` (benchmark) as the latency source
- [ ] Keep the TPS-based upgrades at the end of the benchmark branch (those are unique)
- [ ] Run `pnpm test` (521 tests must pass)
- [ ] Test TUI with tmux — verify verdict column shows correct values

## Notes

- The benchmark branch also has TPS-based verdict upgrades (tps > 20/40/60 bumps verdict up) — these are unique and must be preserved
- Estimated savings: ~30 lines
