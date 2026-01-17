# GitHub Authentication Setup

Your git is configured but needs authentication. Here are the options:

## Current Configuration
- **Remote**: `https://github.com/andrewpbaldwinii/Rolls_App.git`
- **User**: `andrewpbaldwinii`
- **Email**: `andrew.p.baldwinii@gmail.com`
- **Credential Helper**: macOS Keychain

## Option 1: Use Personal Access Token (Recommended)

1. **Create a Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name it: "Rolls App"
   - Select scopes: `repo` (full control of private repositories)
   - Click "Generate token"
   - **Copy the token** (you won't see it again!)

2. **Push from your terminal:**
   ```bash
   cd /Users/andrew/Rolls/Rolls_App
   git push origin main
   ```
   - When prompted for **Username**: `andrewpbaldwinii`
   - When prompted for **Password**: Paste your Personal Access Token (not your GitHub password)

3. **Save credentials (optional):**
   The macOS keychain should save it automatically. If not:
   ```bash
   git config --global credential.helper osxkeychain
   ```

## Option 2: Switch to SSH (More Secure)

1. **Check if you have SSH keys:**
   ```bash
   ls -la ~/.ssh
   ```

2. **If no SSH key exists, create one:**
   ```bash
   ssh-keygen -t ed25519 -C "andrew.p.baldwinii@gmail.com"
   # Press Enter to accept default location
   # Optionally set a passphrase
   ```

3. **Add SSH key to GitHub:**
   ```bash
   cat ~/.ssh/id_ed25519.pub
   # Copy the output
   ```
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Paste your public key
   - Click "Add SSH key"

4. **Change remote to SSH:**
   ```bash
   git remote set-url origin git@github.com:andrewpbaldwinii/Rolls_App.git
   ```

5. **Test connection:**
   ```bash
   ssh -T git@github.com
   # Should say: "Hi andrewpbaldwinii! You've successfully authenticated..."
   ```

6. **Push:**
   ```bash
   git push origin main
   ```

## Option 3: Use GitHub CLI (gh)

1. **Install GitHub CLI:**
   ```bash
   brew install gh
   ```

2. **Authenticate:**
   ```bash
   gh auth login
   # Follow the prompts
   ```

3. **Push:**
   ```bash
   git push origin main
   ```

## Quick Test

To test your connection, run in your terminal:
```bash
cd /Users/andrew/Rolls/Rolls_App
git push origin main
```

If it works, your commit will be pushed to GitHub!

