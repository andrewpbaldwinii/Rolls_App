# Fix Policy Issue - Step by Step

Since the path is correct but the policy still rejects it, let's verify and fix the policy.

## Step 1: Verify Policy Exists

1. Go to **Supabase Dashboard** → **Storage** → **roll-images** → **Policies**
2. **List ALL policies** you see (especially INSERT policies)
3. Check if "Profile image uploads" policy exists
4. If it exists, click on it and **copy the entire WITH CHECK expression**

## Step 2: Check for Conflicting Policies

There might be multiple INSERT policies. Supabase uses **OR** logic between policies, but if one policy explicitly blocks something, it might cause issues.

1. List all INSERT policies
2. Make sure none of them have restrictive conditions that would block profile uploads

## Step 3: Try This Exact Policy Expression

Go to the policy editor and try this **exact** expression (copy it exactly, no modifications):

```sql
bucket_id = 'roll-images' AND (string_to_array(name, '/'))[1] = 'profiles' AND (string_to_array(name, '/'))[2] = auth.uid()::text
```

**Important:** Make sure there are NO extra spaces, NO line breaks, just paste it as one line.

## Step 4: Test the Policy Logic

Run `TEST_POLICY_WITH_YOUR_ID.sql` in Supabase SQL Editor. This will show:
- What `auth.uid()` returns
- Whether the path segments match
- Whether the full condition would pass

## Step 5: Check Policy Permissions

Make sure the policy:
- **Operation**: INSERT (not SELECT or DELETE)
- **Target roles**: `authenticated` (not `anon` or `service_role`)
- **WITH CHECK** (not USING - WITH CHECK is for INSERT)

## Step 6: Alternative - Disable RLS Temporarily (TEST ONLY)

**⚠️ WARNING: Only for testing, re-enable after!**

If you want to test if RLS is the issue:

1. Go to Supabase Dashboard → Storage → roll-images → Settings
2. Temporarily disable RLS (if possible)
3. Try uploading
4. **Re-enable RLS immediately after testing**

## Step 7: Check Supabase Logs

1. Go to **Supabase Dashboard** → **Logs** → **Postgres Logs**
2. Look for errors when you try to upload
3. The logs might show why the policy is rejecting

## Most Likely Issues:

1. **Policy not saved correctly** - The expression might have syntax errors
2. **Multiple policies conflicting** - Another policy might be blocking
3. **auth.uid() not matching** - The UUID format might be different
4. **Policy not propagated** - Wait longer (up to 30 seconds)

## Next Steps:

1. Run `VERIFY_POLICY_EXISTS.sql` to see all policies
2. Run `TEST_POLICY_WITH_YOUR_ID.sql` to test the logic
3. Share the results with me so we can debug further

