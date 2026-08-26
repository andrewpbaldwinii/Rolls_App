# Troubleshooting Profile Image Upload

If you're still getting a security/permission error after updating the storage policy, follow these steps:

## Step 1: Verify the Policy Was Updated

1. Go to **Supabase Dashboard** → **Storage** → **roll-images** bucket → **Policies** tab
2. Find the policy: **"Authenticated users can upload images"**
3. Click **Edit** and check the **WITH CHECK expression**
4. It should contain BOTH:
   - The roll upload check (existing)
   - The profile upload check (new)

### Correct WITH CHECK expression should look like:

```sql
bucket_id = 'roll-images' AND
(
  -- Allow roll uploads (existing)
  (string_to_array(name, '/'))[1] IN (
    SELECT id::text FROM rolls WHERE creator_id = auth.uid()
    UNION
    SELECT roll_id::text FROM roll_contributors WHERE user_id = auth.uid()
  )
  OR
  -- Allow profile uploads (new)
  (
    (string_to_array(name, '/'))[1] = 'profiles' AND
    (string_to_array(name, '/'))[2] = auth.uid()::text
  )
)
```

## Step 2: Check the Exact Error

1. Open your app's console/logs (Metro bundler or device logs)
2. Look for the error message when uploading
3. The error should now show more details including:
   - Error code (e.g., 403, 404)
   - Exact error message
   - Upload path attempted

## Step 3: Verify Your User ID

The policy checks that the path is `profiles/{your-user-id}/filename.jpg`

1. Check your user ID in the app (Profile screen should show it)
2. When uploading, the console should log: `Uploading to Supabase Storage: path: profiles/{your-user-id}/...`
3. Make sure the path matches your actual user ID

## Step 4: Test with SQL Query

Run `VERIFY_PROFILE_POLICY.sql` in Supabase SQL Editor to check if the policy exists.

## Step 5: Common Issues

### Issue: Policy not saved
- **Solution**: Make sure you clicked "Save" or "Update Policy" after editing
- Refresh the policies page to verify it saved

### Issue: Wrong path format
- **Solution**: The path must be exactly `profiles/{userId}/filename.jpg`
- Check console logs to see what path is being used

### Issue: User ID mismatch
- **Solution**: The policy checks `auth.uid()` - make sure you're logged in
- The path's second segment must match your current user ID

### Issue: Base64 not being used
- **Solution**: Check console logs for "✅ Using base64 data for upload"
- If you see "⚠️ No base64 data provided", the image picker may not be returning base64
- Make sure `includeBase64: true` is in the image picker options

## Step 6: Still Not Working?

1. **Check Supabase Logs**:
   - Go to **Supabase Dashboard** → **Logs** → **Postgres Logs**
   - Look for errors related to storage uploads

2. **Try a simpler test**:
   - Create a test policy that allows ALL uploads to profiles/ (temporarily)
   - If that works, the issue is with the policy logic
   - If it still fails, the issue is elsewhere

3. **Check bucket permissions**:
   - Go to **Storage** → **roll-images** bucket → **Settings**
   - Make sure the bucket is accessible
   - Check if RLS is enabled (it should be)

## Debugging Checklist

- [ ] Policy updated in dashboard with profile path check
- [ ] Policy saved successfully
- [ ] User ID matches the path being uploaded
- [ ] Base64 data is being used (check console logs)
- [ ] Bucket exists and is accessible
- [ ] User is authenticated (logged in)
- [ ] Console shows detailed error message

