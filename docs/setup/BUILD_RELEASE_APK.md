# Build Release APK - Install on Phone Without USB

This guide will help you create a release APK that you can install directly on your phone without needing USB connection or Metro bundler.

## Quick Build (Recommended)

Run this single command:

```bash
cd /Users/andrew/Rolls/Rolls_App
./scripts/build-release-apk.sh
```

This will:
1. Bundle all JavaScript code
2. Build a release APK
3. Create the file at: `android/app/build/outputs/apk/release/app-release.apk`

## Manual Build Steps

If you prefer to run the commands manually:

### Step 1: Bundle JavaScript

```bash
cd /Users/andrew/Rolls/Rolls_App

# Create assets directory
mkdir -p android/app/src/main/assets

# Bundle JavaScript for release
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/ \
  --minify false
```

### Step 2: Build Release APK

```bash
cd android
./gradlew assembleRelease
cd ..
```

## Install on Your Phone

The APK will be located at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Option 1: Transfer via Cloud/Email (Easiest)

1. **Upload APK to cloud storage:**
   - Email it to yourself
   - Upload to Google Drive, Dropbox, or iCloud
   - Use AirDrop (if on Mac with iPhone nearby)

2. **On your phone:**
   - Open the email/cloud storage app
   - Download the APK file
   - Open the downloaded APK
   - Allow "Install from unknown sources" if prompted
   - Tap "Install"

### Option 2: Transfer via USB (File Transfer Mode)

1. **Connect phone via USB**
2. **Enable File Transfer mode** on your phone
3. **Copy the APK:**
   ```bash
   # The APK is at:
   android/app/build/outputs/apk/release/app-release.apk
   ```
4. **Copy to your phone's Downloads folder**
5. **On your phone:** Open the APK and install

### Option 3: Install via ADB (if USB connected)

```bash
# Make sure ADB is in your PATH
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"

# Install the APK
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## What This Creates

- **Standalone APK**: Works completely offline
- **No Metro bundler needed**: All JavaScript is bundled inside
- **No USB connection needed**: After installation, works independently
- **Release build**: Optimized for performance

## After Installation

- The app will appear as "Rolls" on your phone
- It will work completely offline
- No need to be connected to your computer
- All features will work (camera, photos, likes, comments, etc.)

## Updating the App

When you make code changes:

1. **Build a new APK:**
   ```bash
   ./scripts/build-release-apk.sh
   ```

2. **Install it again** (it will replace the old version)

## Troubleshooting

### "Install blocked" or "Unknown sources"

1. Go to **Settings** → **Security** (or **Apps** → **Special access**)
2. Enable **"Install unknown apps"** or **"Unknown sources"**
3. Try installing again

### APK won't install

- Make sure you're installing the **release** APK, not debug
- Check that the APK file isn't corrupted (try downloading again)
- Ensure your phone has enough storage space

### Build fails with Java errors

- Make sure Java is installed: `java -version`
- You may need to set `JAVA_HOME` environment variable
- Try using Android Studio's built-in terminal

## File Size

The release APK will be larger than debug (usually 20-50MB) because it includes:
- All JavaScript code (bundled)
- All assets (images, fonts)
- Native libraries
- Optimized for release

## Note

This release build uses the debug keystore for signing. For production distribution (like Google Play Store), you'll need to:
1. Create a release keystore
2. Configure it in `android/app/build.gradle`
3. Keep the keystore file secure (you'll need it for updates)

But for personal use and testing, the current setup works perfectly!
