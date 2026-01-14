# Fix "new row violates row-level security policy" Error

The error means the policy is being evaluated but rejecting the upload. Let's fix this step by step.

## Step 1: Check Console Logs for Exact Path

When you try to upload, look in your Metro terminal for this log:
```
📤 Uploading to Supabase Storage: {
  path: 'profiles/...',
  actualFirstSegment: 'profiles',
  actualSecondSegment: '...',
  userId: '...'
}
```

**Important:** Check if `actualSecondSegment` matches `userId` exactly.

## Step 2: Verify Policy Expression

The policy might have a syntax issue. Try this **exact** expression (no comments, single line):

```sql
bucket_id = 'roll-images' AND ((string_to_array(name, '/'))[1] IN (SELECT id::text FROM rolls WHERE creator_id = auth.uid() UNION SELECT roll_id::text FROM roll_contributors WHERE user_id = auth.uid()) OR ((string_to_array(name, '/'))[1] = 'profiles' AND (string_to_array(name, '/'))[2] = auth.uid()::text))
```

## Step 3: Check for Conflicting Policies

There might be multiple policies. Check:
1. Go to Supabase Dashboard → Storage → roll-images → Policies
2. Look for **ALL** INSERT policies
3. Make sure there's only ONE policy allowing uploads, OR
4. Make sure all policies use OR logic (not AND)

## Step 4: Test the Policy Directly

Run this in Supabase SQL Editor to test if the policy logic works:

```sql
-- Replace YOUR_USER_ID with your actual user ID from the console logs
SELECT 
  'profiles/YOUR_USER_ID/test.jpg' as test_path,
  (string_to_array('profiles/YOUR_USER_ID/test.jpg', '/'))[1] as first_seg,
  (string_to_array('profiles/YOUR_USER_ID/test.jpg', '/'))[2] as second_seg,
  (string_to_array('profiles/YOUR_USER_ID/test.jpg', '/'))[1] = 'profiles' as check1,
  (string_to_array('profiles/YOUR_USER_ID/test.jpg', '/'))[2] = auth.uid()::text as check2;
```

## Step 5: Try Creating a Separate Policy (Recommended)

Instead of modifying the existing policy, create a NEW one:

1. **New Policy**
2. **Name**: `Profile image uploads`
3. **Operation**: `INSERT`
4. **Target roles**: `authenticated`
5. **WITH CHECK**:
```sql
bucket_id = 'roll-images' AND (string_to_array(name, '/'))[1] = 'profiles' AND (string_to_array(name, '/'))[2] = auth.uid()::text
```

This separate policy should work independently.

## Step 6: Check User ID Format

The user ID is likely a UUID. Make sure:
- No extra spaces
- No dashes added/removed
- Exact match between path and auth.uid()

## Most Common Issue

The `auth.uid()::text` might not match the user ID in the path. Check your console logs to see if they match exactly.

