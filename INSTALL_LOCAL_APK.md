# Install App Locally on Phone (No USB Required)

This will create a standalone APK that works completely offline without Metro bundler.

## Step 1: Build the APK

Run these commands in your terminal:

```bash
cd /Users/andrew/Rolls/Rolls_App

# Build the standalone APK
cd android
./gradlew assembleDebug
cd ..
```

The APK will be created at:
`android/app/build/outputs/apk/debug/app-debug.apk`

## Step 2: Transfer APK to Your Phone

**Option A: Email/Cloud Storage (Easiest)**
1. Email the APK to yourself or upload to Google Drive/Dropbox
2. Open the email/drive on your phone
3. Download the APK
4. Open it and install

**Option B: USB File Transfer**
1. Connect phone via USB
2. Copy `android/app/build/outputs/apk/debug/app-debug.apk` to your phone
3. Open the APK file on your phone
4. Install it

**Option C: ADB Install (if USB connected)**
```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Step 3: Install on Phone

1. On your phone, open the APK file
2. If prompted, allow "Install from unknown sources"
3. Tap "Install"
4. Once installed, the app will work completely offline!

## What This Does

- Bundles all JavaScript code into the APK
- Includes all assets (images, fonts, etc.)
- Creates a standalone app that doesn't need Metro bundler
- Works completely offline and when unplugged

## Updating the App

When you make changes:
1. Build a new APK: `cd android && ./gradlew assembleDebug`
2. Install it again (it will replace the old version)

