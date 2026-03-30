#!/usr/bin/env bash
# Finder saves duplicates as "File 2.ext" — illegal for Java (BuildConfig 2.java vs BuildConfig.java).
# Removes any file with a space in its name under node_modules/**/android/build.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COUNT=0
while IFS= read -r -d '' f; do
  rm -f "$f"
  echo "Removed: $f"
  COUNT=$((COUNT + 1))
done < <(find "$ROOT/node_modules" -path '*/android/build/*' -type f -name '* *' -print0 2>/dev/null)
if [[ "$COUNT" -eq 0 ]]; then
  echo "No spaced filenames under node_modules/**/android/build."
else
  echo "Removed $COUNT duplicate path(s). Rebuild the app."
fi
