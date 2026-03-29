#!/usr/bin/env bash
# Clear Metro / Watchman caches when bundling acts stale or odd.
# Run from repo root: npm run metro:reset   OR   bash scripts/reset-metro-cache.sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "=== Metro cache reset (${ROOT}) ==="

echo "→ watchman watch-del-all (ok if watchman not installed)"
watchman watch-del-all 2>/dev/null || true

echo "→ remove Metro / haste-map temp dirs under TMPDIR"
TMP="${TMPDIR:-/tmp}"
find "$TMP" -maxdepth 1 \( -name 'metro-*' -o -name 'haste-map-*' \) 2>/dev/null | while read -r p; do
  rm -rf "$p" && echo "   removed: $p"
done

echo "→ remove node_modules/.cache"
rm -rf node_modules/.cache 2>/dev/null || true

echo "=== Done. Next: npm run start:clean   (or npm run metro:fresh) ==="
echo ""
