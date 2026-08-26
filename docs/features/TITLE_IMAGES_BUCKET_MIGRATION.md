# Title Images Bucket Migration Guide

## Overview

Title images and roll images are now stored in **separate buckets** to avoid conflicts and simplify access patterns:

- **`roll-title-images`** bucket: For title images (uploaded from phone storage)
- **`roll-images`** bucket: For roll images (taken with camera)

## Why Separate Buckets?

1. **Different Access Patterns**: Title images are always public, roll images are locked until release date
2. **Simpler Policies**: Each bucket can have focused, specific policies
3. **Avoid Conflicts**: No path parsing conflicts between `{rollId}/title/...` and `{rollId}/...`
4. **Better Organization**: Clear separation of concerns

## Migration Steps

### Step 1: Create the New Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. Fill in:
   - **Name**: `roll-title-images`
   - **Public bucket**: ✅ **ON** (title images are always public)
   - **File size limit**: 10MB (recommended)
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/heic`, `image/webp`
4. Click **"Create bucket"**

### Step 2: Set Up Storage Policies

Run the SQL script `CREATE_ROLL_TITLE_IMAGES_BUCKET.sql` in the Supabase SQL Editor, or manually create these policies:

#### Policy 1: Roll owners can upload title images
- **Policy Name**: `Roll owners can upload title images`
- **Allowed Operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
```sql
bucket_id = 'roll-title-images' AND
(string_to_array(name, '/'))[1] IN (
  SELECT id::text FROM rolls WHERE creator_id = auth.uid()
)
```

#### Policy 2: Anyone can view title images
- **Policy Name**: `Anyone can view title images`
- **Allowed Operation**: `SELECT`
- **Target roles**: `authenticated, anon`
- **USING expression**:
```sql
bucket_id = 'roll-title-images'
```

#### Policy 3: Roll owners can delete title images
- **Policy Name**: `Roll owners can delete title images`
- **Allowed Operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'roll-title-images' AND
(string_to_array(name, '/'))[1] IN (
  SELECT id::text FROM rolls WHERE creator_id = auth.uid()
)
```

### Step 3: Code Updates

The code has been updated to:
- Use `roll-title-images` bucket for title images
- Use simpler path format: `{rollId}/{filename}.jpg` (no `/title/` subdirectory)
- Handle backward compatibility for existing title image URLs

### Step 4: Migrate Existing Title Images (Optional)

If you have existing title images in the `roll-images` bucket, you can migrate them:

1. **Identify existing title images**: They're stored at path `{rollId}/title/{filename}.jpg` in `roll-images` bucket
2. **Download and re-upload**: Download from old location, upload to new `roll-title-images` bucket at `{rollId}/{filename}.jpg`
3. **Update database**: Update `rolls.title_image_url` to point to new bucket URLs

**Note**: The code includes backward compatibility, so existing title images will continue to work, but new uploads will go to the new bucket.

## Path Format Changes

### Before (Old Format)
- Title images: `roll-images/{rollId}/title/title_{timestamp}.jpg`
- Roll images: `roll-images/{rollId}/photo_{timestamp}.jpg`

### After (New Format)
- Title images: `roll-title-images/{rollId}/title_{timestamp}.jpg`
- Roll images: `roll-images/{rollId}/photo_{timestamp}.jpg`

## Benefits

✅ **Cleaner separation**: Title images and roll images in separate buckets  
✅ **Simpler policies**: No need to check for `/title/` subdirectory  
✅ **Better performance**: Policies are more specific and efficient  
✅ **Easier management**: Clear distinction between image types  
✅ **No conflicts**: Different buckets eliminate path parsing issues  

## Troubleshooting

### Error: "Bucket not found"
- Make sure you've created the `roll-title-images` bucket in Supabase Storage
- Check that the bucket name is exactly `roll-title-images` (case-sensitive)

### Error: "Permission denied" when uploading title image
- Verify the storage policies are set up correctly
- Make sure you're the owner of the roll (only owners can upload title images)

### Existing title images not loading
- The code includes backward compatibility for old URLs
- If images still don't load, check that the old `roll-images` bucket policies allow viewing

## Verification

After migration, verify:

1. ✅ New title image uploads go to `roll-title-images` bucket
2. ✅ Title images are accessible publicly
3. ✅ Roll images still work in `roll-images` bucket
4. ✅ Only roll owners can upload/delete title images
5. ✅ Existing title images still load (backward compatibility)

