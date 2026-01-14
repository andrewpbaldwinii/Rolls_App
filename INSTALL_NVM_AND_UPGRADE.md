# Install nvm and Upgrade Node.js

## Step 1: Install nvm

Run this command in your terminal:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

Or if you have wget:
```bash
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

## Step 2: Reload your shell

After installation, reload your shell configuration:

```bash
source ~/.zshrc
```

Or close and reopen your terminal.

## Step 3: Verify nvm is installed

```bash
nvm --version
```

You should see a version number.

## Step 4: Install and use Node.js 20

```bash
# Install latest Node.js 20
nvm install 20

# Use it
nvm use 20

# Set it as default (optional)
nvm alias default 20

# Verify
node -v
# Should show v20.19.0 or higher
```

## Step 5: Start Metro

```bash
cd /Users/andrew/Rolls/Rolls_App
npm start
```


