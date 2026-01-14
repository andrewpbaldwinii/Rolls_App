#!/bin/bash

# Script to generate Android app icons from a source image
# Usage: ./generate-icons.sh <source_image.png>

if [ -z "$1" ]; then
    echo "Usage: ./generate-icons.sh <source_image.png>"
    echo "Example: ./generate-icons.sh app_icon.png"
    exit 1
fi

SOURCE_IMAGE="$1"

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Error: Source image '$SOURCE_IMAGE' not found"
    exit 1
fi

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "Error: ImageMagick is not installed"
    echo "Install it with: brew install imagemagick (macOS) or apt-get install imagemagick (Linux)"
    exit 1
fi

BASE_DIR="android/app/src/main/res"

# Create directories if they don't exist
mkdir -p "$BASE_DIR/mipmap-mdpi"
mkdir -p "$BASE_DIR/mipmap-hdpi"
mkdir -p "$BASE_DIR/mipmap-xhdpi"
mkdir -p "$BASE_DIR/mipmap-xxhdpi"
mkdir -p "$BASE_DIR/mipmap-xxxhdpi"

echo "Generating Android app icons from $SOURCE_IMAGE..."

# mdpi (48x48)
convert "$SOURCE_IMAGE" -resize 48x48 "$BASE_DIR/mipmap-mdpi/ic_launcher.png"
convert "$SOURCE_IMAGE" -resize 48x48 "$BASE_DIR/mipmap-mdpi/ic_launcher_round.png"
echo "✓ Generated mdpi icons (48x48)"

# hdpi (72x72)
convert "$SOURCE_IMAGE" -resize 72x72 "$BASE_DIR/mipmap-hdpi/ic_launcher.png"
convert "$SOURCE_IMAGE" -resize 72x72 "$BASE_DIR/mipmap-hdpi/ic_launcher_round.png"
echo "✓ Generated hdpi icons (72x72)"

# xhdpi (96x96)
convert "$SOURCE_IMAGE" -resize 96x96 "$BASE_DIR/mipmap-xhdpi/ic_launcher.png"
convert "$SOURCE_IMAGE" -resize 96x96 "$BASE_DIR/mipmap-xhdpi/ic_launcher_round.png"
echo "✓ Generated xhdpi icons (96x96)"

# xxhdpi (144x144)
convert "$SOURCE_IMAGE" -resize 144x144 "$BASE_DIR/mipmap-xxhdpi/ic_launcher.png"
convert "$SOURCE_IMAGE" -resize 144x144 "$BASE_DIR/mipmap-xxhdpi/ic_launcher_round.png"
echo "✓ Generated xxhdpi icons (144x144)"

# xxxhdpi (192x192)
convert "$SOURCE_IMAGE" -resize 192x192 "$BASE_DIR/mipmap-xxxhdpi/ic_launcher.png"
convert "$SOURCE_IMAGE" -resize 192x192 "$BASE_DIR/mipmap-xxxhdpi/ic_launcher_round.png"
echo "✓ Generated xxxhdpi icons (192x192)"

echo ""
echo "✅ All icons generated successfully!"
echo "Next steps:"
echo "1. Rebuild the app: npm run android"
echo "2. Or build APK: cd android && ./gradlew assembleDebug"

