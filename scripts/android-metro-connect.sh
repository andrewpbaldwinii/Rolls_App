#!/usr/bin/env bash
# Run while Metro is (or will be) on port 8081. Forwards device/emulator port to your Mac.
# Emulator: Dev Menu → Settings → Debug server host → blank OR 10.0.2.2:8081 (never "localhost").
set -euo pipefail
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$ANDROID_HOME/platform-tools:$PATH"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -d "$ROOT/node_modules 2" ]]; then
  echo "WARNING: Found \"$ROOT/node_modules 2\" (duplicate). Remove it — it can confuse Metro:"
  echo "  rm -rf \"$ROOT/node_modules 2\""
  echo ""
fi

echo "=== Metro on Mac (must say running) ==="
curl -sS "http://localhost:8081/status" || echo "FAIL — start Metro: cd \"$ROOT\" && npm run start"
echo ""
echo "=== adb devices ==="
adb devices -l
echo ""
echo "=== adb reverse: host 8081 -> device 8081 ==="
adb reverse tcp:8081 tcp:8081
echo "OK."
echo ""
echo "=== Emulator network test ==="
echo "On the emulator, open Chrome and visit: http://10.0.2.2:8081/status"
echo "If that loads \"packager-status:running\", the emulator reaches Metro."
echo ""
echo "Next:"
echo "  1) Terminal A: cd \"$ROOT\" && npm run start"
echo "  2) Terminal B: npm run android:fast"
echo "  3) Debug server host blank or 10.0.2.2:8081 → Reload"
echo "  4) adb uninstall com.rollsapp && npm run android:fast   # clear bad saved dev host"
