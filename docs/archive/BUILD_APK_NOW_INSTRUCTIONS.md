# Build APK - Current Version Instructions

## Quick Build (Recommended)

Run this command in your terminal:

```bash
cd /Users/andrew/Rolls/Rolls_App
./scripts/build-standalone-apk.sh
```

## If the Script Fails

### Option 1: Manual Build Steps

1. **Bundle JavaScript:**
   ```bash
   cd /Users/andrew/Rolls/Rolls_App
   mkdir -p android/app/src/main/assets
   
   npx react-native bundle \
     --platform android \
     --dev false \
     --entry-file index.js \
     --bundle-output android/app/src/main/assets/index.android.bundle \
     --assets-dest android/app/src/main/res/
   ```

2. **Build APK:**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

3. **Find Your APK:**
   The APK will be at:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Option 2: Use Android Studio

1. Open Android Studio
2. Open the `android` folder as a project
3. Go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
4. Wait for the build to complete
5. The APK will be in the same location as above

## Install the APK

### Via ADB (if phone is connected):
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Manually:
1. Transfer the APK file to your phone (via USB, email, or cloud storage)
2. On your phone, open the APK file
3. Allow installation from unknown sources if prompted
4. Install the app

## What's Included in This Build

This APK includes all recent changes:
- ✅ Header with logo on Home screen
- ✅ Dynamic image count updates
- ✅ Locked image placeholders with count display
- ✅ Enhanced error handling and logging for roll images
- ✅ Real-time subscriptions for image updates
- ✅ Focus-based refresh for screens

## Troubleshooting

### If you get "Java not found":
- Install Java JDK 17 or later
- Set JAVA_HOME environment variable
- Or use Android Studio which includes Java

### If you get permission errors:
- Make sure the build script is executable: `chmod +x scripts/build-standalone-apk.sh`
- Try running with `sudo` (not recommended, but may work)

### If build fails:
- Clean the build: `cd android && ./gradlew clean`
- Delete `android/app/build` folder
- Try building again

## Next Steps After Building

1. Test the APK on your device
2. Verify images appear correctly in rolls
3. Check that image counts update when taking photos
4. Verify locked images show placeholders with counts

