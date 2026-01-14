# App Icon Setup Instructions

## App Name Updated ✅
The app name has been updated from "RN0814Test" to "Rolls" in:
- `android/app/src/main/res/values/strings.xml`
- `app.json`

## Adding Your Logo as App Icon

### Step 1: Add Your Logo Image
1. Save your logo image (the teal "R" with film strip) as `app_icon.png` in the project root
2. The image should be at least 1024x1024 pixels for best quality
3. Recommended format: PNG with transparent background

### Step 2: Generate Android Icons

You have two options:

#### Option A: Using Online Tool (Easiest)
1. Go to https://www.appicon.co/ or https://icon.kitchen/
2. Upload your `app_icon.png`
3. Download the generated Android icon set
4. Extract and copy the icons to:
   ```
   android/app/src/main/res/mipmap-mdpi/ic_launcher.png (48x48)
   android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png (48x48)
   android/app/src/main/res/mipmap-hdpi/ic_launcher.png (72x72)
   android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png (72x72)
   android/app/src/main/res/mipmap-xhdpi/ic_launcher.png (96x96)
   android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png (96x96)
   android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png (144x144)
   android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png (144x144)
   android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png (192x192)
   android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png (192x192)
   ```

#### Option B: Using ImageMagick (Command Line)
If you have ImageMagick installed:

```bash
# Create icons for each density
# mdpi (48x48)
convert app_icon.png -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png
convert app_icon.png -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png

# hdpi (72x72)
convert app_icon.png -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png
convert app_icon.png -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png

# xhdpi (96x96)
convert app_icon.png -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
convert app_icon.png -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png

# xxhdpi (144x144)
convert app_icon.png -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
convert app_icon.png -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png

# xxxhdpi (192x192)
convert app_icon.png -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
convert app_icon.png -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png
```

### Step 3: Rebuild the App
After updating the icons, rebuild the app:

```bash
# Clean build
cd android
./gradlew clean
cd ..

# Rebuild
npm run android
```

## Note About "Test App" Issue
The app showing as "RN0814TEST" and not working when unplugged suggests you're running a debug build. To create a standalone app:

1. **For Development**: The debug build should work when unplugged if you build a proper APK
2. **For Release**: You'll need to create a signed release build

To build a standalone debug APK:
```bash
cd android
./gradlew assembleDebug
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

You can install this APK on your phone and it will work independently.

