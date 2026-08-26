# Fix APK Build - Include JavaScript Bundle

The APK was built but it's missing the JavaScript bundle. You need to bundle the JavaScript first, then rebuild.

## Step 1: Bundle the JavaScript

Run this in your terminal:

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

This will create the JavaScript bundle file that the app needs.

## Step 2: Rebuild the APK

```bash
cd android
./gradlew clean
./gradlew assembleDebug
cd ..
```

## Step 3: Reinstall

```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Verify Bundle Was Created

After Step 1, check that the bundle exists:

```bash
ls -lh android/app/src/main/assets/index.android.bundle
```

You should see a file (usually several MB in size). If it doesn't exist, the bundle step failed.

## Why This Happened

The APK was built without bundling the JavaScript first. The standalone APK needs the JavaScript bundle file included in the assets folder, otherwise the app has no code to run and crashes.

