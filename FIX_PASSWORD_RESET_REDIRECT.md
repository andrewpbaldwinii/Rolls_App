# Fix Password Reset Email Link

## The Problem

When you click the password reset link in your email, it opens a blank webpage in the browser instead of opening the app. This happens because Supabase needs to be configured to redirect to your app.

## Solution 1: Configure Supabase Redirect URL (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: **Authentication → URL Configuration**

2. **Add Redirect URLs**
   - In the **Redirect URLs** section, add:
     ```
     rollsapp://reset-password
     ```
   - Also add (for testing):
     ```
     http://localhost:3000
     https://wdduwfzzwwmwxgttilga.supabase.co/auth/v1/verify
     ```

3. **Update Site URL** (if needed)
   - Set **Site URL** to: `rollsapp://`

4. **Save Changes**

5. **Test Again**
   - Request a new password reset
   - Click the link in the email
   - It should now open the app instead of the browser

## Solution 2: Workaround (If Link Still Opens in Browser)

If the link still opens in a browser, you can still reset your password:

1. **Request Password Reset**
   - Go to login screen
   - Enter your email
   - Tap "Forgot Password?"
   - Check your email

2. **Click the Email Link**
   - Even if it opens in a browser, that's okay
   - The link verifies your token with Supabase

3. **Return to App**
   - Open the Rolls app
   - Navigate to Reset Password screen (from login screen)
   - The app will detect the recovery session
   - Enter your new password

## How It Works Now

The app has been updated to:
- ✅ Handle deep links when they work
- ✅ Detect recovery sessions automatically
- ✅ Show helpful instructions if no session is found
- ✅ Work even if the email link opens in a browser

## Testing

1. Request password reset from login screen
2. Check email for reset link
3. Click the link (even if it opens in browser)
4. Open the app and go to Reset Password screen
5. Enter new password
6. Login with new password

## If Still Not Working

If the deep link still doesn't work:

1. **Check AndroidManifest.xml** - Make sure the intent filters are correct (already added)
2. **Rebuild the app** - Deep link changes require a rebuild:
   ```bash
   npm run android
   ```
3. **Check Supabase Settings** - Make sure redirect URLs are saved correctly

## Alternative: Manual Token Entry (Future Enhancement)

If needed, we can add a feature to manually enter the token from the email URL, but the current flow should work once Supabase is configured properly.
