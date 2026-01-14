# Quick Fix for "Unexpected Token" Error

## Solution: Clear Metro Cache

The error is likely due to Metro bundler cache. Here's how to fix it:

### Option 1: Restart Metro with Cache Reset (Easiest)

1. **Stop Metro** if it's running (press `Ctrl+C` in the terminal where Metro is running)

2. **Restart with cache reset:**
   ```bash
   npx react-native start --reset-cache
   ```

3. **In a new terminal, rebuild the app:**
   ```bash
   npm run android
   ```

### Option 2: Full Clean (If Option 1 doesn't work)

```bash
# Stop Metro first (Ctrl+C)

# Clear Metro cache
rm -rf /tmp/metro-*
rm -rf /tmp/haste-*
rm -rf node_modules/.cache

# Clear watchman (if installed)
watchman watch-del-all 2>/dev/null || true

# Restart Metro
npx react-native start --reset-cache
```

### Option 3: Nuclear Option (Complete Clean)

```bash
# Stop Metro
# Then run:
rm -rf node_modules
rm -rf /tmp/metro-*
rm -rf /tmp/haste-*
npm install
npx react-native start --reset-cache
```

## Most Likely Fix

Just run:
```bash
npx react-native start --reset-cache
```

Then in another terminal:
```bash
npm run android
```

This should resolve the "unexpected token" error.

