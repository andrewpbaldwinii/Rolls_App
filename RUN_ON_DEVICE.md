# Run App on Device for Development

## Quick Start (Recommended)

### Option 1: Terminal Commands (Easiest)

**Terminal 1 - Start Metro Bundler:**
```bash
cd /Users/andrew/Rolls/Rolls_App
npm start
```

**Terminal 2 - Run on Device:**
```bash
cd /Users/andrew/Rolls/Rolls_App
npm run android
```

This will:
- Build the app
- Install it on your connected device
- Launch the app
- Connect to Metro bundler for hot reloading

### Option 2: Android Studio

1. **Open Android Studio**
2. **Open Project**: `/Users/andrew/Rolls/Rolls_App/android`
3. **Connect your device via USB** (enable USB debugging)
4. **Start Metro Bundler** (in a separate terminal):
   ```bash
   cd /Users/andrew/Rolls/Rolls_App
   npm start
   ```
5. **In Android Studio**: Click the green "Run" button (▶️) or press `Shift+F10`
   - Or go to **Run** → **Run 'app'**

## Prerequisites

### 1. Enable USB Debugging on Your Phone

1. Go to **Settings** → **About phone**
2. Tap **Build number** 7 times (enables Developer options)
3. Go back to **Settings** → **Developer options**
4. Enable **USB debugging**
5. Connect phone via USB

### 2. Verify Device is Connected

```bash
# Check if device is detected
adb devices
```

You should see your device listed. If not:
- Make sure USB debugging is enabled
- Try a different USB cable
- Accept the "Allow USB debugging" prompt on your phone

## Development Workflow

### Start Development Session

**Terminal 1** (Metro Bundler - keep this running):
```bash
cd /Users/andrew/Rolls/Rolls_App
npm start
```

**Terminal 2** (Run app - run this when you want to rebuild):
```bash
cd /Users/andrew/Rolls/Rolls_App
npm run android
```

### Hot Reloading

Once the app is running:
- **Shake your device** or press `Ctrl+M` (Android) to open developer menu
- Or press `R` twice in Metro bundler terminal to reload
- Code changes will automatically reload!

### Common Commands

```bash
# Start Metro bundler
npm start

# Start Metro with cache reset (if having issues)
npm start -- --reset-cache

# Run on Android device
npm run android

# Run on Android device with cache reset
npm run android -- --reset-cache

# Check connected devices
adb devices

# View logs
adb logcat | grep ReactNativeJS
```

## Troubleshooting

### "No devices found"

1. Check USB connection
2. Run `adb devices` to verify
3. Enable USB debugging on phone
4. Try different USB cable/port

### "Metro bundler not connecting"

1. Make sure Metro is running (`npm start`)
2. Shake device → **Settings** → **Debug server host**
3. Enter your computer's IP address (e.g., `192.168.1.100:8081`)

### "Build failed"

1. Clean build:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npm run android
   ```

2. Reset Metro cache:
   ```bash
   npm start -- --reset-cache
   ```

### App crashes on launch

1. Check Metro bundler is running
2. Check device logs: `adb logcat | grep ReactNativeJS`
3. Try rebuilding: `npm run android`

## Development vs Release

- **Development** (this guide): Uses Metro bundler, hot reload, debugging
- **Release APK**: Standalone file, no Metro needed (see `BUILD_RELEASE_APK.md`)

## Quick Reference

```bash
# Full development setup
cd /Users/andrew/Rolls/Rolls_App

# Terminal 1
npm start

# Terminal 2 (in new terminal window)
npm run android
```

That's it! Your app will run on your device and you can develop with hot reloading.
