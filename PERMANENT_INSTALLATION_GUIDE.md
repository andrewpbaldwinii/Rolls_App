# Permanent Installation Guide - Rolls App

This guide will help you permanently install the Rolls app on your Android device.

## Pre-Installation Checklist

✅ **APK File Ready**: `android/app/build/outputs/apk/debug/app-debug.apk` (141MB)
✅ **APK Location**: `/Users/andrew/Rolls/Rolls_App/android/app/build/outputs/apk/debug/app-debug.apk`

## Step 1: Transfer APK to Your Device

### Option A: Email Method (Recommended - Easiest)
1. **On your computer:**
   - Open your email client
   - Create a new email to yourself
   - Attach the file: `android/app/build/outputs/apk/debug/app-debug.apk`
   - Send the email

2. **On your Android device:**
   - Open your email app
   - Find the email with the APK attachment
   - Tap the attachment to download it
   - The file will be saved to your Downloads folder

### Option B: Cloud Storage (Google Drive/Dropbox)
1. **Upload to cloud:**
   - Upload `android/app/build/outputs/apk/debug/app-debug.apk` to Google Drive or Dropbox
   
2. **Download on device:**
   - Open Google Drive/Dropbox app on your phone
   - Download the APK file

### Option C: USB Transfer
1. Connect your Android device to your computer via USB
2. Enable "File Transfer" mode on your phone when prompted
3. Copy the APK file to your phone's Downloads folder
4. Disconnect your phone

## Step 2: Enable Installation from Unknown Sources

**For Android 8.0 (Oreo) and newer:**
1. When you tap the APK file, Android will prompt you
2. Tap **"Settings"** in the prompt
3. Toggle **"Allow from this source"** ON
4. Go back and tap the APK again

**Or manually enable:**
1. Go to **Settings** → **Apps** → **Special app access** → **Install unknown apps**
2. Select your **email app** or **file manager** (Files, My Files, etc.)
3. Toggle **"Allow from this source"** ON

**For older Android versions:**
1. Go to **Settings** → **Security**
2. Enable **"Unknown sources"** or **"Install unknown apps"**

## Step 3: Install the APK

1. **Open the APK file:**
   - Open your **Files** or **My Files** app
   - Navigate to **Downloads** folder
   - Tap on `app-debug.apk`

2. **Install:**
   - Tap **"Install"** button
   - Wait for installation to complete (may take 1-2 minutes)
   - Tap **"Open"** or **"Done"**

3. **Find the app:**
   - The app will appear in your app drawer as **"Rolls"**
   - You can also add it to your home screen

## Step 4: Verify Installation

1. **Launch the app:**
   - Open the Rolls app from your app drawer
   - The app should launch successfully

2. **Test functionality:**
   - Sign in or create an account
   - Test key features to ensure everything works
   - The app should work completely offline (no Metro bundler needed)

## Troubleshooting

### "App not installed" Error
- **Solution**: The APK might be corrupted. Re-download it and try again.
- Make sure you have enough storage space on your device

### "Install blocked" Error
- **Solution**: Make sure you've enabled "Install unknown apps" for your email/file manager app
- Go back to Settings and enable it for the specific app you're using

### App Crashes on Launch
- **Solution**: The APK might not be a standalone build. You may need to rebuild with bundled JavaScript.
- Check if you need to run the bundle command first (see BUILD_STANDALONE_APK.md)

### Can't Find the APK File
- **Location on computer**: `/Users/andrew/Rolls/Rolls_App/android/app/build/outputs/apk/debug/app-debug.apk`
- **File size**: 141MB
- **Date**: January 13, 2025

## Updating the App

When you make changes and want to update:
1. Build a new APK: `cd android && ./gradlew assembleDebug`
2. Transfer the new APK to your device (same methods as above)
3. Install it - it will automatically replace the old version
4. No need to uninstall the old version first

## Notes

- This is a **debug APK** - perfect for testing and personal use
- The app will work **completely offline** once installed
- No need for Metro bundler or USB connection after installation
- For production/release, you'll want to create a signed release APK

## Quick Reference

**APK Location**: `android/app/build/outputs/apk/debug/app-debug.apk`
**File Size**: 141MB
**Installation Time**: ~1-2 minutes
**Works Offline**: Yes ✅

