# Fix Title Image HTTP 400 Error

## Problem
Title images upload successfully but return **HTTP 400** when trying to display them. The URL format looks correct but the file can't be accessed.

## Root Cause
The `roll-images` bucket needs to be **public** and have a **SELECT policy** that allows reading files.

## Solution

### Step 1: Make the bucket public (if not already)
1. Go to **Supabase Dashboard** → **Storage** → **roll-images**
2. Click **Settings** (gear icon)
3. Make sure **Public bucket** is **ON** ✅
4. Click **Save**

### Step 2: Add SELECT policy for roll-images
1. Go to **Storage** → **roll-images** → **Policies**
2. Click **New Policy** → **For full customization, use the policy editor**
3. Create a new policy:

**Policy name:** `Anyone can view roll images`  
**Allowed operation:** `SELECT`  
**Target roles:** `anon, authenticated`  
**Policy definition:** `USING (bucket_id = 'roll-images')`

Or use this SQL in the **SQL Editor**:

```sql
-- Allow anyone to view images in roll-images bucket
CREATE POLICY "Anyone can view roll images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'roll-images');
```

### Step 3: Verify the upload path
After uploading, check the Metro console logs. You should see:
- `✅ Title image uploaded successfully. Upload response path: {path}`
- `🔗 Generated public URL: {url}`

The path should match: `{rollId}/title/title_{timestamp}.jpg`

### Step 4: Test
Try uploading a title image again. The image should now load without HTTP 400 errors.

## If it still doesn't work
1. Check that the bucket is actually public (Settings → Public bucket = ON)
2. Verify the SELECT policy exists and applies to `anon, authenticated`
3. Check the Metro console for the exact upload path vs URL path mismatch
4. Try accessing the URL directly in a browser to see the exact error

