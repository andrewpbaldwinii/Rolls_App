#!/usr/bin/env bash
# Physical Android devices use host "localhost" for Metro — that means the PHONE, not your Mac.
# This forwards device localhost:8081 → your Mac's 8081. Run before opening the app (npm run android does this).
set -u
if ! command -v adb >/dev/null 2>&1; then
  echo "[android-metro-usb] adb not in PATH — install Android SDK platform-tools."
  exit 0
fi
if adb reverse tcp:8081 tcp:8081 2>/dev/null; then
  echo "[android-metro-usb] OK: device localhost:8081 → this Mac (Metro)."
else
  echo "[android-metro-usb] adb reverse skipped (no USB device / unauthorized). Emulator does not need this."
  echo "  Wi‑Fi only: Dev Menu → Settings → Debug server host → YOUR_MAC_IP:8081 and use: npm run start"
fi
adb devices -l 2>/dev/null || true
exit 0
