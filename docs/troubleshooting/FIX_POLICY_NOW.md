# Fix Policy - Your Path is Correct!

Your path format is **perfect**:
- Path: `profiles/YOUR_USER_UUID/profile_...`
- First segment: `profiles` ✓
- Second segment: `YOUR_USER_UUID` ✓
- User ID matches ✓

The issue is **definitely with the policy**. Let's fix it:

## Option 1: Create a Separate Policy (RECOMMENDED)

This is the most reliable approach:

1. Go to **Supabase Dashboard** → **Storage** → **roll-images** → **Policies**
2. Click **"New Policy"**
3. Fill in:
   - **Policy Name**: `Profile image uploads`
   - **Allowed Operation**: `INSERT`
   - **Target roles**: `authenticated`
   - **WITH CHECK expression** (paste this EXACTLY):
   ```sql
   bucket_id = 'roll-images' AND (string_to_array(name, '/'))[1] = 'profiles' AND (string_to_array(name, '/'))[2] = auth.uid()::text
   ```
4. Click **Save**

This creates a separate policy that should work independently.

## Option 2: Fix the Existing Policy

If you want to keep one policy, try this **exact** expression (single line, no comments):

```sql
bucket_id = 'roll-images' AND ((string_to_array(name, '/'))[1] IN (SELECT id::text FROM rolls WHERE creator_id = auth.uid() UNION SELECT roll_id::text FROM roll_contributors WHERE user_id = auth.uid()) OR ((string_to_array(name, '/'))[1] = 'profiles' AND (string_to_array(name, '/'))[2] = auth.uid()::text))
```

1. Go to **Supabase Dashboard** → **Storage** → **roll-images** → **Policies**
2. Click **Edit** on "Authenticated users can upload images"
3. **Delete everything** in the WITH CHECK field
4. **Paste the expression above** (single line)
5. Click **Save**

## Option 3: Test the Policy First

Run `TEST_POLICY.sql` in Supabase SQL Editor to verify the logic works with your user ID.

## After Updating

1. Wait 5-10 seconds for the policy to propagate
2. Try uploading again
3. It should work!

## Why This Should Work

Your path is:
- `profiles/YOUR_USER_UUID/profile_...`

The policy checks:
- `(string_to_array(name, '/'))[1] = 'profiles'` → TRUE ✓
- `(string_to_array(name, '/'))[2] = auth.uid()::text` → Should be TRUE if auth.uid() returns your UUID ✓

If it still doesn't work after creating the separate policy, there might be:
- A caching issue (wait longer)
- Multiple conflicting policies
- An issue with how Supabase evaluates the policy

Try Option 1 (separate policy) first - it's the most reliable!

