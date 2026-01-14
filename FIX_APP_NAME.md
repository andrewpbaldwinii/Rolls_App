# Fix App Name on Device

The app name has been updated in the code to "Rolls", but your Pixel 8 is still showing "RN0814Test" because the old app is cached on your device.

## Solution: Uninstall and Reinstall

### Step 1: Uninstall the Old App
On your Pixel 8:
1. Long press the app icon
2. Tap "App info" or the info icon
3. Tap "Uninstall"
4. Confirm uninstall

**OR** use ADB command:
```bash
adb uninstall com.rollsapp
```

### Step 2: Clean Build
```bash
cd android
./gradlew clean
cd ..
```

### Step 3: Rebuild and Install
```bash
npm run android
```

This will:
- Build a fresh APK with the name "Rolls"
- Install it on your connected device
- The app will now appear as "Rolls" on your home screen

## Alternative: Build Standalone APK

If you want to install it manually:

```bash
cd android
./gradlew assembleDebug
```

Then install the APK from:
`android/app/build/outputs/apk/debug/app-debug.apk`

Transfer this file to your phone and install it. The app will show as "Rolls".

## Verify the Fix

After reinstalling, check:
- App icon shows "Rolls" (not "RN0814Test")
- App works when unplugged from computer
- App name in Settings → Apps → Rolls

