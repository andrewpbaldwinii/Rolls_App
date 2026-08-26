# Fix Profile Image Upload - Step by Step

You're getting a 403 error because the storage policy needs to be updated. Follow these exact steps:

## Step 1: Open Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **"Storage"** in the left sidebar

## Step 2: Open the roll-images Bucket

1. Click on the **"roll-images"** bucket
2. Click the **"Policies"** tab at the top

## Step 3: Edit the Upload Policy

1. Find the policy named: **"Authenticated users can upload images"**
2. Click the **Edit** button (pencil icon) or click on the policy name
3. You'll see a **"WITH CHECK expression"** field

## Step 4: Replace the WITH CHECK Expression

**Current policy probably looks like this:**
```sql
bucket_id = 'roll-images' AND
(string_to_array(name, '/'))[1] IN (
  SELECT id::text FROM rolls WHERE creator_id = auth.uid()
  UNION
  SELECT roll_id::text FROM roll_contributors WHERE user_id = auth.uid()
)
```

**Replace it with this (adds profile upload support):**
```sql
bucket_id = 'roll-images' AND
(
  -- Allow roll uploads (existing functionality)
  (string_to_array(name, '/'))[1] IN (
    SELECT id::text FROM rolls WHERE creator_id = auth.uid()
    UNION
    SELECT roll_id::text FROM roll_contributors WHERE user_id = auth.uid()
  )
  OR
  -- Allow profile uploads (new functionality)
  (
    (string_to_array(name, '/'))[1] = 'profiles' AND
    (string_to_array(name, '/'))[2] = auth.uid()::text
  )
)
```

## Step 5: Save the Policy

1. Click **"Save"** or **"Update Policy"**
2. Wait for confirmation that it saved

## Step 6: Verify It Worked

1. Go back to your app
2. Try uploading a profile image again
3. It should work now!

## What This Does

The updated policy now allows authenticated users to upload to:
- **Roll paths**: `{rollId}/filename.jpg` (existing - still works)
- **Profile paths**: `profiles/{userId}/filename.jpg` (new - now works)

## Troubleshooting

### If you can't find the policy:
- Make sure you're in the **"roll-images"** bucket
- Click the **"Policies"** tab (not "Settings")
- Look for any policy with "upload" or "INSERT" in the name

### If the policy won't save:
- Check for syntax errors (make sure all parentheses match)
- Try refreshing the page and editing again
- Make sure you're using the Supabase Dashboard (not SQL Editor)

### If you still get 403 after updating:
1. Wait a few seconds for the policy to propagate
2. Try closing and reopening the app
3. Check the console logs to see the exact path being uploaded
4. Verify your user ID matches what's in the path

## Quick Test

After updating, the path should be:
- Format: `profiles/{your-user-id}/profile_1234567890.jpg`
- First segment: `profiles` ✓
- Second segment: Your user ID (UUID) ✓

The policy checks that:
- First segment = `'profiles'`
- Second segment = `auth.uid()` (your current user ID)

If these match, the upload should work!

