#!/usr/bin/env bash
# Gradle expects android/build/generated/autolinking/autolinking.json (from RN settings).
# `./gradlew clean` removes android/build; if the next build skips regenerating it, tasks like
# :app:generateAutolinkingPackageList fail. Run this after clean (or use npm run android:install).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/android/build/generated/autolinking/autolinking.json"
mkdir -p "$(dirname "$OUT")"
cd "$ROOT"
npx @react-native-community/cli config > "$OUT"
echo "Wrote $OUT"
