#!/usr/bin/env bash
# Deletes node_modules/**/android/build in every dependency (Gradle recreates on next build).
# Use when Kotlin/Gradle fails on classpath snapshots (e.g. Operation not permitted, unreadable outputs).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
shopt -s nullglob
n=0
for b in "$ROOT/node_modules"/*/"android/build" "$ROOT/node_modules"/@*/*/"android/build"; do
  [[ -d "$b" ]] || continue
  rm -rf "$b"
  n=$((n + 1))
done
shopt -u nullglob
echo "Removed android/build from $n package(s)."
