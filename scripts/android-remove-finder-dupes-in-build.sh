#!/usr/bin/env bash
# Finder saves duplicates as "File 2.ext" or "build 2" folders — breaks Gradle (merger 2.xml, etc.).
# When app/root build trees or library artifacts are dirty, also removes every node_modules/**/android/build
# so Kotlin/Gradle caches cannot stay half-corrupt.
# Run from repo root: bash scripts/android-remove-finder-dupes-in-build.sh
# Gradle sets ANDROID_DUPES_FIX_QUIET=1 to avoid noisy logs every build.
set -euo pipefail
log() { [ "${ANDROID_DUPES_FIX_QUIET:-}" = 1 ] || printf '%s\n' "$*"; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COUNT=0
NUKE_ALL_LIB_BUILDS=false

nuke_build_tree_if_dupes() {
  local base="$1"
  [[ -d "$base" ]] || return 0
  if find "$base" \( -type f -o -type d \) -name '* *' -print -quit 2>/dev/null | grep -q .; then
    rm -rf "$base"
    log "Removed build tree (Finder duplicates inside): $base"
    COUNT=$((COUNT + 1))
    NUKE_ALL_LIB_BUILDS=true
  fi
}

for dup in "$ROOT/android/app/build 2" "$ROOT/android/build 2"; do
  if [[ -e "$dup" ]]; then
    rm -rf "$dup"
    log "Removed Finder duplicate folder: $dup"
    COUNT=$((COUNT + 1))
    NUKE_ALL_LIB_BUILDS=true
  fi
done

nuke_build_tree_if_dupes "$ROOT/android/app/build"
nuke_build_tree_if_dupes "$ROOT/android/build"

LIB_FILE_REMOVES=0
while IFS= read -r -d '' f; do
  rm -f "$f"
  LIB_FILE_REMOVES=$((LIB_FILE_REMOVES + 1))
  COUNT=$((COUNT + 1))
done < <(find "$ROOT/node_modules" -path '*/android/build/*' -type f -name '* *' -print0 2>/dev/null)
if [[ "$LIB_FILE_REMOVES" -gt 0 ]]; then
  NUKE_ALL_LIB_BUILDS=true
fi
while IFS= read -r -d '' d; do
  rm -rf "$d"
  COUNT=$((COUNT + 1))
done < <(find "$ROOT/node_modules" -path '*/android/build/*' -depth -type d -name '* *' -print0 2>/dev/null)

if [[ "$NUKE_ALL_LIB_BUILDS" == true ]]; then
  shopt -s nullglob
  for b in "$ROOT/node_modules"/*/"android/build" "$ROOT/node_modules"/@*/*/"android/build"; do
    [[ -d "$b" ]] || continue
    rm -rf "$b"
    log "Removed library build cache: $b"
    COUNT=$((COUNT + 1))
  done
  shopt -u nullglob
fi

for cxx in "$ROOT/android/app/.cxx" "$ROOT/android/.cxx"; do
  [[ -d "$cxx" ]] || continue
  while IFS= read -r -d '' f; do
    rm -f "$f"
    COUNT=$((COUNT + 1))
  done < <(find "$cxx" -type f -name '* *' -print0 2>/dev/null)
  while IFS= read -r -d '' d; do
    rm -rf "$d"
    COUNT=$((COUNT + 1))
  done < <(find "$cxx" -depth -type d -name '* *' -print0 2>/dev/null)
done

if [[ "${ANDROID_DUPES_FIX_QUIET:-}" != 1 ]]; then
  if [[ "$COUNT" -eq 0 ]]; then
    echo "OK: no Finder duplicate build artifacts removed."
  else
    echo "Cleaned $COUNT path(s). Rebuild."
  fi
fi
