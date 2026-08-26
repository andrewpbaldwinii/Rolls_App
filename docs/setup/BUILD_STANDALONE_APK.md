# Build Standalone APK (Works Offline)

The app is currently running in debug mode, which connects to Metro bundler on your computer. To make it work permanently on your phone (even when unplugged), you need to build a standalone APK with the JavaScript bundle included.

## Quick Method: Use the Script

```bash
cd /Users/andrew/Rolls/Rolls_App
./scripts/build-standalone-apk.sh
```

## Manual Method

### Step 1: Bundle the JavaScript

```bash
cd /Users/andrew/Rolls/Rolls_App

# Create assets directory
mkdir -p android/app/src/main/assets

# Bundle JavaScript
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/
```

### Step 2: Build the APK

```bash
cd android
./gradlew assembleDebug
```

### Step 3: Install the APK

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

**Option A: Install via ADB**
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

**Option B: Install Manually**
1. Transfer the APK file to your phone (via USB, email, or cloud storage)
2. On your phone, open the APK file
3. Allow installation from unknown sources if prompted
4. Install the app

## What This Does

- Bundles all your JavaScript code into a single file
- Includes all assets (images, fonts, etc.)
- Creates a standalone APK that doesn't need Metro bundler
- The app will work completely offline

## After Installation

The app will appear on your phone as "Rolls" and will work independently without being connected to your computer or Metro bundler.

## Updating the App

When you make changes to your code:
1. Run the build script again
2. Install the new APK (it will replace the old one)

## Note

This creates a debug APK. For production, you'll want to:
- Create a release keystore
- Build a release APK
- Sign it properly

But for now, the debug APK will work perfectly for testing on your device!


