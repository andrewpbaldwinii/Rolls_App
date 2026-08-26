# Quick App Icon Update Guide

## ✅ App Name Fixed
The app name has been changed from "RN0814Test" to "Rolls"

## 📱 To Update the App Icon

### Step 1: Save Your Logo
1. Save your teal "R" logo image as `app_icon.png` in the project root directory
2. Make sure it's at least 1024x1024 pixels (PNG format recommended)

### Step 2: Generate Icons

**Option 1: Use the provided script (if you have ImageMagick)**
```bash
./scripts/generate-icons.sh app_icon.png
```

**Option 2: Use an online tool**
1. Go to https://www.appicon.co/
2. Upload your `app_icon.png`
3. Select "Android" platform
4. Download the generated icons
5. Extract and copy all `ic_launcher.png` and `ic_launcher_round.png` files to:
   - `android/app/src/main/res/mipmap-mdpi/`
   - `android/app/src/main/res/mipmap-hdpi/`
   - `android/app/src/main/res/mipmap-xhdpi/`
   - `android/app/src/main/res/mipmap-xxhdpi/`
   - `android/app/src/main/res/mipmap-xxxhdpi/`

### Step 3: Rebuild
```bash
cd android
./gradlew clean
cd ..
npm run android
```

## 🔧 About the "Test App" Issue

The app showing as "RN0814TEST" and not working when unplugged is because you're running a debug build directly. To create a standalone APK:

```bash
cd android
./gradlew assembleDebug
```

Then install the APK from: `android/app/build/outputs/apk/debug/app-debug.apk`

This APK will work independently on your phone without being connected to your computer.

