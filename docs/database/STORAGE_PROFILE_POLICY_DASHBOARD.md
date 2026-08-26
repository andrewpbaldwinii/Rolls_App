# How to Add Profile Image Upload Policy in Supabase Dashboard

Since SQL policies can't be created directly on `storage.objects`, you need to use the Supabase Dashboard.

## Step-by-Step Instructions

### Step 1: Open Storage Policies
1. Go to your **Supabase Dashboard**
2. Click **"Storage"** in the left sidebar
3. Click on the **"roll-images"** bucket
4. Click the **"Policies"** tab

### Step 2: Update Existing Upload Policy

1. Find the policy named **"Authenticated users can upload images"**
2. Click the **Edit** button (pencil icon) or **"Edit Policy"**
3. In the **"WITH CHECK expression"** field, replace the existing code with:

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

4. Click **"Save"** or **"Update Policy"**

### Step 3: Verify

After saving, try uploading a profile image again. It should work!

## What This Does

The updated policy now allows authenticated users to upload to:
- **Roll paths**: `{rollId}/filename.jpg` (existing)
- **Profile paths**: `profiles/{userId}/filename.jpg` (new)

Both paths are checked, so existing roll uploads continue to work, and profile uploads are now allowed.

## Alternative: Create Separate Policy

If you prefer a separate policy instead of modifying the existing one:

1. Click **"New Policy"** in the Policies tab
2. **Policy Name**: "Users can upload profile images"
3. **Operation**: INSERT
4. **Target roles**: authenticated
5. **WITH CHECK expression**:
```sql
bucket_id = 'roll-images' AND
(string_to_array(name, '/'))[1] = 'profiles' AND
(string_to_array(name, '/'))[2] = auth.uid()::text
```
6. Click **"Save"**

