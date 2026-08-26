# Fix: Roll Images Not Appearing

## Problem
Images exist in the `roll-images` storage bucket and are linked to rolls in the `roll_images` table, but they don't appear in the UI.

## Root Causes

### 1. **RLS Policies Blocking Access**
The Row Level Security (RLS) policies on `roll_images` table might be blocking the SELECT query.

**Check:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'roll_images';

-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'roll_images';
```

**Fix:** Ensure the SELECT policy allows users to view images from rolls they own or contribute to.

### 2. **Incorrect Image URLs**
The URLs stored in `roll_images.image_url` might be incorrect or inaccessible.

**Check:**
```sql
-- Check URL format
SELECT 
  id,
  roll_id,
  image_url,
  CASE 
    WHEN image_url LIKE '%/storage/v1/object/public/roll-images/%' THEN 'Public URL'
    WHEN image_url LIKE '%/storage/v1/object/sign/roll-images/%' THEN 'Signed URL'
    ELSE 'Invalid format'
  END as url_type
FROM roll_images
WHERE roll_id = '3a52b2cd-5531-45e3-8aa2-f042a38a13cc';
```

**Fix:** If URLs are incorrect, regenerate them using the storage path.

### 3. **Storage Bucket Permissions**
The `roll-images` bucket might have been changed to private, making public URLs inaccessible.

**Check:**
- Go to Supabase Dashboard → Storage → roll-images bucket
- Check if bucket is set to "Public" or "Private"

**Fix:** 
- If bucket is private, either:
  - Make it public (for roll images that should be visible after release date)
  - OR use signed URLs instead of public URLs

### 4. **Storage Policies Blocking Access**
Storage policies might be blocking SELECT access to images.

**Check:**
```sql
-- Check storage policies
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%roll-images%';
```

**Fix:** Ensure there's a SELECT policy that allows viewing images from the `roll-images` bucket.

## Diagnostic Steps

1. **Run the diagnostic SQL:**
   ```bash
   # Run DIAGNOSE_ROLL_IMAGES.sql in Supabase SQL Editor
   # Replace the roll ID with your actual roll ID
   ```

2. **Check browser console:**
   - Open React Native debugger or check logs
   - Look for errors when fetching images
   - Check for "403 Forbidden" or "404 Not Found" errors

3. **Verify database records:**
   ```sql
   SELECT COUNT(*) FROM roll_images 
   WHERE roll_id = '3a52b2cd-5531-45e3-8aa2-f042a38a13cc'
     AND caption != '__title_image__';
   ```

4. **Verify storage files:**
   - Go to Supabase Dashboard → Storage → roll-images
   - Navigate to the roll ID folder
   - Verify files exist

## Solutions

### Solution 1: Fix RLS Policies

If RLS is blocking access, update the SELECT policy:

```sql
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view images in accessible Rolls" ON roll_images;

-- Create/update SELECT policy
CREATE POLICY "Users can view images in accessible Rolls"
ON roll_images FOR SELECT
TO authenticated
USING (
  -- Can view if they own the roll
  EXISTS (
    SELECT 1 FROM rolls 
    WHERE rolls.id = roll_images.roll_id 
    AND rolls.creator_id = auth.uid()
  )
  OR
  -- Can view if they're a contributor
  EXISTS (
    SELECT 1 FROM roll_contributors 
    WHERE roll_contributors.roll_id = roll_images.roll_id 
    AND roll_contributors.user_id = auth.uid()
  )
);
```

### Solution 2: Regenerate Image URLs

If URLs are incorrect, create a function to regenerate them:

```sql
-- This function regenerates public URLs for roll images
-- Run this in Supabase SQL Editor
UPDATE roll_images
SET image_url = 
  'https://[YOUR_PROJECT_REF].supabase.co/storage/v1/object/public/roll-images/' || 
  SUBSTRING(image_url FROM 'roll-images/(.+)')
WHERE image_url NOT LIKE '%/storage/v1/object/public/roll-images/%'
  AND image_url LIKE '%roll-images%';
```

Replace `[YOUR_PROJECT_REF]` with your actual Supabase project reference.

### Solution 3: Use Signed URLs (If Bucket is Private)

If the bucket is private, update the code to use signed URLs instead of public URLs. This requires changes to the storage service.

### Solution 4: Verify Storage Policies

Ensure storage policies allow SELECT access:

```sql
-- Check if SELECT policy exists
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%roll-images%'
  AND cmd = 'SELECT';

-- If missing, create it:
CREATE POLICY "Anyone can view roll images"
ON storage.objects FOR SELECT
USING (bucket_id = 'roll-images');
```

## Quick Fix Checklist

- [ ] Run `DIAGNOSE_ROLL_IMAGES.sql` to identify the issue
- [ ] Check RLS policies on `roll_images` table
- [ ] Verify storage bucket is public (or use signed URLs)
- [ ] Check storage SELECT policies
- [ ] Verify image URLs in database are correct format
- [ ] Check browser/console for loading errors
- [ ] Test with a new image upload to see if it works

## Testing

After applying fixes:

1. Navigate to a roll with images
2. Check console logs for any errors
3. Verify images appear in RollDetailScreen
4. Verify image count updates in RollsScreen

## Notes

- Title images work because they're stored in `rolls.title_image_url` and are always public
- Roll images are stored in `roll_images` table and should be private until release date
- The bucket structure is: `{rollId}/filename.jpg` for roll images, `{rollId}/title/filename.jpg` for title images

