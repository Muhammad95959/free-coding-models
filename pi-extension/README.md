# pi-extension — Legacy Compatibility Wrapper

> ⚠️ This directory is a **thin re-export wrapper** maintained for backwards compatibility with existing `~/.pi/agent/settings.json` local-path configurations.

The primary canonical Pi adapter lives in **[`packages/fcm-pi`](../packages/fcm-pi)**, and all shared core scanning/ranking logic lives in **[`packages/fcm-agent-core`](../packages/fcm-agent-core)**.

---

## Directory Contents

- `extensions/index.js` — Re-exports the canonical adapter from `packages/fcm-pi`.
- `request-params.json` — Capture artifact for testing provider error payloads.

---

## Recommended Config

Point Pi directly at the canonical package path:

```json
{
  "packages": [
    "/Users/<your-username>/Documents/GitHub/free-coding-models/packages/fcm-pi"
  ]
}
```

See [`packages/fcm-pi/README.md`](../packages/fcm-pi/README.md) for full features and `/fcm` slash commands.
