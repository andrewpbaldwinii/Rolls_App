#!/usr/bin/env bash
# Start an AVD. Default uses host GPU (much smoother than software GL).
#
# If the emulator exits immediately or shows a black screen on your Mac, fall back:
#   ROLLS_EMULATOR_GPU=swiftshader_indirect bash scripts/start-android-emulator.sh
#
# Usage: bash scripts/start-android-emulator.sh [AVD_NAME]
# Another AVD: npm run android:emulator -- Medium_Phone_API_36.1
set -euo pipefail
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"

# host = hardware acceleration (recommended). swiftshader_indirect = CPU GL (janky but safest).
GPU="${ROLLS_EMULATOR_GPU:-host}"

exec "$ANDROID_HOME/emulator/emulator" -avd "${1:-Pixel_8}" \
  -gpu "$GPU" \
  -no-audio
