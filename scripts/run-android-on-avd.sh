#!/usr/bin/env bash
# Install the debug app on a specific running AVD (avoids wrong device when several emulators are up).
# Usage: bash scripts/run-android-on-avd.sh [AVD_NAME]
# Default AVD: Pixel_8
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$ANDROID_HOME/platform-tools:$PATH"

AVD="${1:-Pixel_8}"
SERIAL=""

while IFS= read -r line; do
  [[ "$line" == List* ]] && continue
  [[ -z "${line// }" ]] && continue
  dev="${line%%[[:space:]]*}"
  state="${line##*[[:space:]]}"
  [[ "$dev" == emulator-* ]] || continue
  [[ "$state" == "device" ]] || continue
  name="$(adb -s "$dev" emu avd name 2>/dev/null | head -1 | tr -d '\r')"
  if [[ "$name" == "$AVD" ]]; then
    SERIAL="$dev"
    break
  fi
done < <(adb devices)

if [[ -z "$SERIAL" ]]; then
  echo "No running emulator for AVD \"$AVD\"."
  echo "Start it with: npm run android:emulator"
  echo "(or: npm run android:emulator -- $AVD)"
  exit 1
fi

echo "Using $SERIAL ($AVD)"
exec npx react-native run-android --deviceId "$SERIAL"
