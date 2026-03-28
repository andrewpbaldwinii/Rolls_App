#!/usr/bin/env bash
# RN 0.81 ships the macOS Hermes compiler as `hermes` under osx-bin, but the Android
# Gradle plugin looks for `hermesc`. Symlink so release builds can find the binary.
set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HROOT="$REPO_ROOT/node_modules/react-native/sdks/hermesc/osx-bin"
if [[ "$(uname -s)" != "Darwin" ]]; then
  exit 0
fi
if [[ ! -d "$REPO_ROOT/node_modules/react-native" ]]; then
  echo "ensure-macos-hermesc: react-native not found. Run: cd \"$REPO_ROOT\" && npm install" >&2
  exit 0
fi
if [[ ! -f "$HROOT/hermes" ]]; then
  echo "ensure-macos-hermesc: missing $HROOT/hermes (Hermes compiler ships inside the react-native package)." >&2
  echo "Restore it: cd \"$REPO_ROOT\" && rm -rf node_modules && npm install" >&2
  exit 0
fi
if [[ -e "$HROOT/hermesc" ]]; then
  exit 0
fi
cd "$HROOT"
ln -sf hermes hermesc
