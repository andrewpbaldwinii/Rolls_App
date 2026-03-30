#!/usr/bin/env bash
# Hard reset Android-related caches:
# - node_modules/**/android/.cxx (CMake; avoids broken `ninja clean` during gradle clean)
# - node_modules/**/android/build (Java/Kotlin outputs in libs — fixes missing proto.tab.values / compileDebugKotlin)
# - android/app/build, android/build
# Prefer this over `./gradlew clean` when native or Kotlin incremental caches are corrupted.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "Nuke: node_modules/**/android/.cxx"
find "$ROOT/node_modules" -path '*/android/.cxx' -type d -print0 2>/dev/null \
  | xargs -0 rm -rf 2>/dev/null || true
echo "Nuke: node_modules/**/android/build (library intermediates)"
find "$ROOT/node_modules" -path '*/android/build' -type d -print0 2>/dev/null \
  | xargs -0 rm -rf 2>/dev/null || true
rm -rf "$ROOT/android/app/build" "$ROOT/android/build" "$ROOT/android/app/.cxx" 2>/dev/null || true
echo "Done. Run: cd android && ./gradlew --stop"
echo "Then: cd .. && npx react-native run-android --active-arch-only"
