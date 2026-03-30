#!/usr/bin/env bash
# Apply CMake guard in react-native-gesture-handler (see patch-gesture-handler-cmake.js).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
node "$REPO_ROOT/scripts/patch-gesture-handler-cmake.js"
