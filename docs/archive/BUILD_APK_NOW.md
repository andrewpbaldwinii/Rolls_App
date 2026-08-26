# Build Standalone APK - Run These Commands

Since you've been able to build the app before, run these commands in your **own terminal** (not in Cursor):

## Step 1: Navigate to Project
```bash
cd /Users/andrew/Rolls/Rolls_App
```

## Step 2: Bundle JavaScript (Optional - Gradle can do this automatically)
```bash
mkdir -p android/app/src/main/assets
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/
```

## Step 3: Build the APK
```bash
cd android
./gradlew assembleDebug
cd ..
```

## Step 4: Install on Your Device

**Option A: Install via ADB (if device is connected)**
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

**Option B: Manual Install**
1. Find the APK at: `android/app/build/outputs/apk/debug/app-debug.apk`
2. Transfer it to your phone (via USB, email, or cloud storage)
3. On your phone, open the APK file
4. Allow installation from unknown sources if prompted
5. Install the app

## What This Does

- Bundles all your JavaScript code into the APK
- Includes all assets (images, fonts, etc.)
- Creates a standalone app that works **without Metro bundler**
- The app will work completely **offline** and **when unplugged**

## After Installation

The app will appear on your phone as "Rolls" and will work independently without being connected to your computer.

## Troubleshooting

If you get Java errors:
- Make sure Java is installed: `java -version`
- If using Android Studio, Java should be included
- You may need to set `JAVA_HOME` environment variable

If you get permission errors:
- Make sure you're in the project directory
- Try: `chmod +x android/gradlew`

