# Fix Metro Bundler - Upgrade Node.js

## Problem
You're running Node.js v20.11.0, but React Native CLI requires Node.js >= 20.19.0 for the `styleText` function.

## Solution: Upgrade Node.js

### Option 1: Install nvm First (Recommended)

Since you don't have nvm installed, install it first:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload your shell
source ~/.zshrc

# Verify nvm is installed
nvm --version

# Install and use Node.js 20
nvm install 20
nvm use 20

# Verify
node -v
# Should show v20.19.0 or higher
```

### Option 2: Using Homebrew (If you have it)

Check if you have Homebrew:
```bash
brew --version
```

If you have Homebrew:
```bash
# Update Homebrew
brew update

# Upgrade Node.js
brew upgrade node

# Verify
node -v
```

### Option 3: Download from nodejs.org (Easiest - No Terminal Commands)

1. Go to https://nodejs.org/
2. Download the latest LTS version (currently 20.x or higher)
3. Run the installer (.pkg file on macOS)
4. Follow the installation wizard
5. **Restart your terminal** (important!)
6. Verify: `node -v`

This is the simplest option if you're not comfortable with terminal commands.

### Option 4: Using n (Node Version Manager)

```bash
# Install n (if not already installed)
npm install -g n

# Install latest Node.js 20
sudo n 20

# Verify
node -v
```

## After Upgrading

1. **Verify Node.js version:**
   ```bash
   node -v
   # Should be v20.19.0 or higher
   ```

2. **Start Metro bundler:**
   ```bash
   cd /Users/andrew/Rolls/Rolls_App
   npm start
   ```

3. **If you still get errors, clear cache:**
   ```bash
   npm start -- --reset-cache
   ```

## Quick Check

Run this to see your current version:
```bash
node -v
```

If it shows v20.11.0 or lower, you need to upgrade!

## Recommended: Option 3 (Download from nodejs.org)

This is the easiest and most reliable method. Just download and install like any other app!

