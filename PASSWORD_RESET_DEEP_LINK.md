# Password reset → open the app (deep link)

## Supabase dashboard (required)

1. **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add exactly:
   - `rollsapp://reset-password`
3. Save.

Without this, the email link may hit a dead page or refuse to redirect to the app.

## How it works

1. User taps **Forgot password** → `resetPasswordForEmail` uses `redirectTo: 'rollsapp://reset-password'`.
2. The email contains a link like `https://<project-ref>.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=...`.
3. **If the app opens that HTTPS link** (Android app link in `AndroidManifest.xml`), **AuthContext** calls `verifyOtp({ token_hash, type: 'recovery' })`, enables **password recovery** mode, and **AuthNavigator** opens **Reset Password**.
4. **If the browser handles the link first**, Supabase redirects to `rollsapp://reset-password#access_token=...&refresh_token=...&type=recovery`. **AuthContext** uses `setSession` on those tokens (same recovery mode + reset screen).

## Native config (already in repo)

- **Android:** intent-filters for `rollsapp` / `reset-password` and for `https` → `…/auth/v1/verify` on your **Supabase project host**.
- **Important:** The `https` intent-filter `android:host` must match the hostname in your `.env` `SUPABASE_URL` (e.g. `abcd.supabase.co`). If it does not, the verify URL opens in the browser instead; the custom-scheme redirect may still work, but can be flaky on some devices (hash fragment).
- **iOS:** `Info.plist` `CFBundleURLTypes` scheme `rollsapp` (email links usually go through Safari first, then `rollsapp://…`).

Rebuild the app after changing native config.
