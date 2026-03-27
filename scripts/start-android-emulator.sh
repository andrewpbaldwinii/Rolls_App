#!/usr/bin/env bash
# Default GPU path can exit early on some Mac setups; swiftshader is slower but reliable.
# Usage: bash scripts/start-android-emulator.sh [AVD_NAME]
# Another AVD: npm run android:emulator -- Medium_Phone_API_36.1
set -euo pipefail
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
exec "$ANDROID_HOME/emulator/emulator" -avd "${1:-Pixel_8}" \
  -gpu swiftshader_indirect \
  -no-audio
