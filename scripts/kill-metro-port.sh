#!/usr/bin/env bash
# Free default Metro port so `npm run start:clean` can bind (avoids EADDRINUSE / "nothing happened").
if ! command -v lsof >/dev/null 2>&1; then
  echo "lsof not found; skip port cleanup."
  exit 0
fi
PIDS=$(lsof -ti :8081 2>/dev/null || true)
if [ -z "$PIDS" ]; then
  echo "Port 8081 is already free."
  exit 0
fi
echo "Stopping process(es) on port 8081: $PIDS"
kill $PIDS 2>/dev/null || true
sleep 1
echo "Done."
