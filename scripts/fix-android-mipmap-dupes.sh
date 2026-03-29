#!/usr/bin/env bash
# Remove/rename invalid Android mipmap files (spaces in names break mergeDebugResources).
# Finder/macOS duplicates often become "ic_launcher 2.png" — invalid for Android resources.
# Run from repo root: bash scripts/fix-android-mipmap-dupes.sh
# Gradle sets MIPMAP_FIX_QUIET=1 to avoid noisy logs every build.
set -euo pipefail
log() { [ "${MIPMAP_FIX_QUIET:-}" = 1 ] || printf '%s\n' "$*"; }
RES="$(cd "$(dirname "$0")/.." && pwd)/android/app/src/main/res"
[ -d "$RES" ] || { echo "Not found: $RES" >&2; exit 1; }

for dir in "$RES"/mipmap-*; do
  [ -d "$dir" ] || continue
  for base in ic_launcher ic_launcher_round; do
    if [ -f "$dir/${base} 2.png" ] && [ -f "$dir/${base}.png" ]; then
      rm -f "$dir/${base} 2.png"
      log "Removed duplicate: $dir/${base} 2.png"
    elif [ -f "$dir/${base} 2.png" ]; then
      rm -f "$dir/${base}.png"
      mv "$dir/${base} 2.png" "$dir/${base}.png"
      log "Renamed ${base} 2.png -> ${base}.png in $(basename "$dir")"
    fi
  done
  rm -f "$dir/ic_launcher_2.png" "$dir/ic_launcher_round_2.png" 2>/dev/null || true
done

BAD=$(find "$RES" -name '* *' -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$BAD" != 0 ]; then
  echo "Still have res files with spaces — remove or rename manually:" >&2
  find "$RES" -name '* *' -type f >&2
  exit 1
fi
log "OK: no mipmap files with spaces under res/"
