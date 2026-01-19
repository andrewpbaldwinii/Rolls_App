#!/bin/bash

# Add Android SDK platform-tools to PATH in .zshrc

ADB_PATH="/Users/andrew/Library/Android/sdk/platform-tools"
ZSHRC_FILE="$HOME/.zshrc"

# Check if already added
if grep -q "platform-tools" "$ZSHRC_FILE" 2>/dev/null; then
    echo "✅ ADB path already exists in .zshrc"
else
    echo "" >> "$ZSHRC_FILE"
    echo "# Android SDK platform-tools" >> "$ZSHRC_FILE"
    echo "export PATH=\$PATH:$ADB_PATH" >> "$ZSHRC_FILE"
    echo "✅ Added ADB to PATH in .zshrc"
fi

echo ""
echo "To apply the changes, run:"
echo "  source ~/.zshrc"
echo ""
echo "Or restart your terminal."
