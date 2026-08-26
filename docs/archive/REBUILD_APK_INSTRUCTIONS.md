# Rebuild APK with JavaScript Bundle

## Status ✅

The JavaScript bundle has been successfully created and is located at:
```
android/app/src/main/assets/index.android.bundle
```

However, your existing APK was built **before** this bundle was created, so it won't work standalone. You need to rebuild the APK.

## Quick Rebuild (Run in Your Terminal)

Since Java isn't available in the Cursor environment, run these commands in **your own terminal**:

### Option 1: Use the Build Script

```bash
cd /Users/andrew/Rolls/Rolls_App
./scripts/build-standalone-apk.sh
```

The script will:
1. ✅ Bundle the JavaScript (already done, but will update if needed)
2. 🔨 Build the APK with the bundle included

### Option 2: Manual Build Commands

```bash
cd /Users/andrew/Rolls/Rolls_App

# Build the APK (bundle is already in place)
cd android
./gradlew assembleDebug
cd ..
```

## Alternative: Use Android Studio

1. Open Android Studio
2. Open the `android` folder as a project
3. Go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
4. Wait for the build to complete

## Install the New APK

After rebuilding, install the updated APK:

### Via ADB (if phone is connected):
```bash
cd /Users/andrew/Rolls/Rolls_App
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Manually:
1. Find the APK: `android/app/build/outputs/apk/debug/app-debug.apk`
2. Transfer it to your phone (via USB, email, cloud storage, etc.)
3. On your phone, open the APK file
4. Allow installation from unknown sources if prompted
5. Install the app

## What's Different Now

The new APK will include:
- ✅ All JavaScript code bundled inside the APK
- ✅ All assets (images, fonts, etc.)
- ✅ Works completely offline
- ✅ Works when phone is unplugged from computer
- ✅ No need for Metro bundler running

## After Installation

The app will work independently on your phone without needing to be connected to your computer or Metro bundler. You can take it anywhere and use it offline!

## Troubleshooting

If `./gradlew` gives Java errors:
- Make sure Java is installed: `java -version`
- Set JAVA_HOME if needed (Android Studio usually handles this)
- Try using Android Studio's built-in build system instead

If the APK still doesn't work after rebuilding:
- Make sure you installed the NEW APK (the one just built)
- Uninstall the old app first, then install the new one
- Check that `android/app/src/main/assets/index.android.bundle` exists and is recent
