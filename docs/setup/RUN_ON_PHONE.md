# Running Rolls App on Your Phone

## 🚀 Quick Start

Metro bundler is already running! Now choose your platform:

---

## 📱 Option 1: Android Phone

### Prerequisites
- Android phone with USB debugging enabled
- USB cable to connect phone to computer
- Android SDK installed (usually comes with Android Studio)

### Steps

1. **Connect your Android phone:**
   ```bash
   # Check if device is connected
   adb devices
   ```
   You should see your device listed.

2. **Run the app:**
   ```bash
   npm run android
   ```
   
   This will:
   - Build the Android app
   - Install it on your connected phone
   - Launch the app automatically

3. **If you want to build a standalone APK** (works without computer):
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   
   Then install the APK from:
   `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🍎 Option 2: iPhone (iOS)

### Prerequisites
- Mac with Xcode installed
- iPhone connected via USB
- Apple Developer account (free account works for development)

### Steps

1. **Generate iOS project** (if iOS folder doesn't exist):
   ```bash
   # We need to create the iOS folder first
   # See instructions below
   ```

2. **Install CocoaPods dependencies:**
   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **Open in Xcode:**
   ```bash
   open ios/RollsApp.xcworkspace
   ```
   
   Or run directly:
   ```bash
   npm run ios
   ```

### Generating iOS Folder

Since the iOS folder doesn't exist yet, you have two options:

**Option A: Use React Native Upgrade Helper**
1. Go to https://react-native-community.github.io/upgrade-helper/
2. Select your React Native version (0.81.4)
3. Follow instructions to add iOS folder

**Option B: Manual Setup** (I can help create this)

---

## 🔧 Troubleshooting

### Metro Bundler Issues
- Metro is already running in the background
- If you need to restart: `npm start`
- Make sure port 8081 is not blocked

### Android Issues
- **Device not found**: Enable USB debugging in Developer Options
- **Build fails**: Try `cd android && ./gradlew clean && cd .. && npm run android`
- **App crashes**: Check Metro bundler is running

### iOS Issues
- **No iOS folder**: Follow "Generating iOS Folder" steps above
- **Pod install fails**: Make sure CocoaPods is installed: `sudo gem install cocoapods`
- **Xcode errors**: Make sure Xcode Command Line Tools are set: `sudo xcode-select --switch /Applications/Xcode.app`

---

## 📝 Current Status

✅ Metro bundler: Running  
✅ Android setup: Ready  
⚠️ iOS setup: Needs iOS folder generation  

Choose your platform and follow the steps above!


