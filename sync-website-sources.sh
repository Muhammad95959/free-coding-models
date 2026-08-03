#!/usr/bin/env bash
# 📖 Sync the website's vendored `sources.js` with the monorepo root.
# Run this after editing `sources.js` at the project root.
#
# The website bundles a copy of `sources.js` at
# `website/src/_fcm-sources/sources.js` because Vercel only deploys the
# `website/` subdirectory — the monorepo root isn't available in the
# build context. This script keeps the vendored copy in sync.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/sources.js"
DEST_DIR="$ROOT/website/src/_fcm-sources"
DEST="$DEST_DIR/sources.js"

if [ ! -f "$SRC" ]; then
  echo "❌ $SRC not found" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"
cp "$SRC" "$DEST"
echo "✅ $SRC → $DEST"
