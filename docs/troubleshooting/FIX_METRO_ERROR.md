# Fix Metro Bundler "Unexpected Token" Error

## Quick Fix Steps

### Step 1: Clear Metro Bundler Cache
```bash
# Stop Metro if it's running (Ctrl+C)

# Clear Metro cache
npx react-native start --reset-cache

# Or clear all caches
rm -rf node_modules/.cache
rm -rf /tmp/metro-*
rm -rf /tmp/haste-*
```

### Step 2: Clear React Native Cache
```bash
# Clear watchman cache
watchman watch-del-all

# Clear npm cache (optional)
npm start -- --reset-cache
```

### Step 3: Rebuild
```bash
# Clean Android build
cd android
./gradlew clean
cd ..

# Rebuild
npm run android
```

## Common Causes

1. **Metro Cache Issue** - Most common cause
   - Solution: Run with `--reset-cache` flag

2. **Syntax Error in Code** - Check for:
   - Missing semicolons
   - Unclosed brackets
   - TypeScript syntax in .js files

3. **Node Modules Issue** - Corrupted dependencies
   - Solution: `rm -rf node_modules && npm install`

4. **Babel Configuration** - Incorrect Babel setup
   - Check `babel.config.js` is correct

## If Error Persists

Check the exact error message in:
- Metro bundler terminal output
- React Native console
- Browser dev tools (if using)

The error will show which file and line number has the issue.

