# Rebuild APK with Messaging Features

The JavaScript bundle has been created with all the new messaging and notifications features. You just need to complete the Android build.

## Quick Build

Run this in your terminal:

```bash
cd /Users/andrew/Rolls/Rolls_App/android
./gradlew assembleRelease
```

## If Java is Not Found

If you get "Unable to locate a Java Runtime", you have a few options:

### Option 1: Use Android Studio (Easiest)

1. Open Android Studio
2. Open the project: `/Users/andrew/Rolls/Rolls_App/android`
3. Go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
4. Wait for the build to complete
5. The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### Option 2: Install Java JDK

If you don't have Java installed:

```bash
# Install Java via Homebrew
brew install openjdk@17

# Set JAVA_HOME
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

Then run:
```bash
cd /Users/andrew/Rolls/Rolls_App/android
./gradlew assembleRelease
```

### Option 3: Use Android Studio's Terminal

1. Open Android Studio
2. Open the project
3. Open the terminal in Android Studio (View → Tool Windows → Terminal)
4. Run:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

## After Build Completes

The APK will be at:
```
/Users/andrew/Rolls/Rolls_App/android/app/build/outputs/apk/release/app-release.apk
```

## Install on Your Phone

1. **Transfer the APK** to your phone (email, Google Drive, USB, etc.)
2. **Open the APK** on your phone
3. **Allow installation** from unknown sources if prompted
4. **Install** the app

The new version includes:
- ✅ Messaging system
- ✅ Inbox screen
- ✅ Notifications with inbox button
- ✅ Message button on profiles
- ✅ All previous features

## Current Status

✅ JavaScript bundle created (includes all new features)
⏳ APK build pending (needs Java/Gradle)

Once you run the Gradle build, the APK will include all the messaging features!
