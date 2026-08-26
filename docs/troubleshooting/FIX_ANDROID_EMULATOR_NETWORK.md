# Fix Android Emulator Network Issues

## Problem
Getting "Network request failed" errors in Android emulator but not on USB-connected device.

## Solution Applied

1. **Created Network Security Config** (`android/app/src/main/res/xml/network_security_config.xml`)
   - Allows all HTTPS traffic (for Supabase)
   - Allows cleartext for localhost/emulator (for Metro bundler)

2. **Updated AndroidManifest.xml**
   - Added `android:networkSecurityConfig="@xml/network_security_config"`

## Next Steps

### 1. Rebuild the App
```bash
cd /Users/andrew/Rolls/Rolls_App
cd android
./gradlew clean
./gradlew assembleDebug
```

### 2. Restart the Emulator
- Close the emulator completely
- Restart it from Android Studio or command line
- Make sure the emulator has internet access (check browser in emulator)

### 3. Check Emulator Network Settings
- Open Settings in the emulator
- Go to Network & Internet
- Make sure Wi-Fi/Mobile data is enabled
- Try opening a browser in the emulator and visiting a website

### 4. Verify Emulator Internet Connection
In the emulator:
- Open Chrome browser
- Try visiting `https://google.com`
- If this fails, the emulator doesn't have internet access

### 5. Alternative: Use Cold Boot
If the emulator still has issues:
```bash
# List emulators
emulator -list-avds

# Cold boot an emulator (replace with your emulator name)
emulator -avd <emulator_name> -wipe-data
```

### 6. Check Firewall/Antivirus
- Make sure your firewall isn't blocking the emulator
- Temporarily disable antivirus to test

### 7. Use Different Emulator
- Try creating a new emulator in Android Studio
- Or use a different API level (e.g., API 33, 34)

## Why This Happens

Android emulators run in a virtual environment and sometimes have network connectivity issues:
- DNS resolution problems
- Network adapter issues
- Firewall blocking virtual network
- Emulator network configuration

## If Still Not Working

1. **Use USB Device Instead**: The USB device works fine, so you can continue development there
2. **Check Metro Bundler**: Make sure Metro is running on your host machine
3. **Verify Supabase URL**: It should match `SUPABASE_URL` in your local `.env` (Project Settings → API).

## Quick Test

After rebuilding, test if the emulator can reach Supabase:
1. Open the app in emulator
2. Try to sign in or make any API call
3. Check console logs for network errors
