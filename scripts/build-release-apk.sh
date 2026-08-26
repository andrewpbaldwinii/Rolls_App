#!/bin/bash

# Build Release APK for Rolls App
# This creates a release APK that can be installed directly on phones

echo "📦 Building release APK for Rolls App..."
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Create assets directory if it doesn't exist
mkdir -p android/app/src/main/assets

# Bundle the JavaScript for release
echo "📦 Bundling JavaScript for release..."
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/ \
  --minify false

# Build the release APK
echo ""
echo "🔨 Building release APK..."
cd android
./gradlew assembleRelease

echo ""
echo "✅ Build complete!"
echo ""
echo "📱 Release APK location:"
echo "   android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "📲 To install on your device:"
echo ""
echo "Option 1: Transfer and install manually"
echo "   1. Copy the APK to your phone (via USB, email, or cloud storage)"
echo "   2. Open the APK file on your phone"
echo "   3. Allow installation from unknown sources if prompted"
echo "   4. Install the app"
echo ""
echo "Option 2: Install via ADB (if device connected)"
echo "   adb install -r android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "The app will work completely offline without Metro bundler!"
