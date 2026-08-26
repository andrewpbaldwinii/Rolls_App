# Debug Profile Upload 403 Error

Let's debug why you're still getting a 403 error.

## Step 1: Check Console Logs

When you try to upload, check your Metro terminal or device logs. You should see:

```
📤 Uploading to Supabase Storage: {
  path: 'profiles/...',
  pathSegments: [...],
  actualFirstSegment: 'profiles',
  actualSecondSegment: '...',
  userId: '...'
}
```

**Please share:**
1. What is the `actualSecondSegment` value?
2. What is the `userId` value?
3. Do they match?

## Step 2: Verify Policy in Dashboard

1. Go to Supabase Dashboard → Storage → roll-images → Policies
2. Click on "Authenticated users can upload images"
3. **Copy the entire WITH CHECK expression** and share it with me
4. Make sure it was saved correctly

## Step 3: Try Creating a Separate Policy

Instead of modifying the existing policy, let's try creating a NEW separate policy:

1. In the Policies tab, click **"New Policy"**
2. **Policy Name**: `Users can upload profile images`
3. **Allowed Operation**: `INSERT`
4. **Target roles**: `authenticated`
5. **WITH CHECK expression**:
```sql
bucket_id = 'roll-images' AND (string_to_array(name, '/'))[1] = 'profiles' AND (string_to_array(name, '/'))[2] = auth.uid()::text
```
6. Click **Save**

This creates a separate policy just for profile uploads, which might work better.

## Step 4: Check User ID Format

The user ID might be a UUID. Make sure:
- The path uses the exact same UUID format
- No extra spaces or characters
- The UUID matches `auth.uid()` exactly

## Step 5: Test Policy Directly

You can test if the policy works by running this in Supabase SQL Editor (replace with your actual user ID):

```sql
-- Test if the policy would allow this path
SELECT 
  auth.uid() as current_user_id,
  'profiles/' || auth.uid()::text || '/test.jpg' as test_path,
  (string_to_array('profiles/' || auth.uid()::text || '/test.jpg', '/'))[1] as first_segment,
  (string_to_array('profiles/' || auth.uid()::text || '/test.jpg', '/'))[2] as second_segment,
  (string_to_array('profiles/' || auth.uid()::text || '/test.jpg', '/'))[1] = 'profiles' as first_check,
  (string_to_array('profiles/' || auth.uid()::text || '/test.jpg', '/'))[2] = auth.uid()::text as second_check;
```

This will show you if the path segments match what the policy expects.

