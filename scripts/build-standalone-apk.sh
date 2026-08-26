#!/bin/bash

# Build Standalone APK for Rolls App
# This creates an APK that works offline without Metro bundler

echo "📦 Building standalone APK for Rolls App..."
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Create assets directory if it doesn't exist
mkdir -p android/app/src/main/assets

# Bundle the JavaScript
echo "📦 Bundling JavaScript..."
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/

# Build the APK
echo ""
echo "🔨 Building APK..."
cd android
./gradlew assembleDebug

echo ""
echo "✅ Build complete!"
echo ""
echo "📱 APK location:"
echo "   android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "To install on your device:"
echo "   adb install -r android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "Or transfer the APK to your phone and install it manually."


