# Bucket Separation Guide: Title Images vs Roll Images

## The Problem

Having title images and roll images in the same bucket causes conflicts because:

1. **Title images**: Always public, should be immediately accessible
2. **Roll images**: Conditionally public (locked until `release_date`), need access control

When both are in the same bucket, you can't have different access patterns - you either make the bucket public (defeats roll image security) or private (breaks title image access).

## The Solution: Two Separate Buckets

### `roll-title-images` Bucket (PUBLIC)
- **Purpose**: Title images uploaded from phone storage
- **Access**: Always public, no authentication needed
- **Path format**: `{rollId}/title_{timestamp}.jpg`
- **URL type**: Public URLs (no signing needed)
- **Who can upload**: Only roll owners
- **When visible**: Immediately, always visible

### `roll-images` Bucket (PRIVATE)
- **Purpose**: Roll images taken with camera
- **Access**: Conditionally public based on `release_date`
- **Path format**: `{rollId}/photo_{timestamp}.jpg`
- **URL type**: Signed URLs (temporary, access-controlled)
- **Who can upload**: Roll owners and contributors
- **When visible**: 
  - Immediately if user owns/contributes to roll
  - After `release_date` if set
  - Immediately if no `release_date` is set

## Setup Instructions

### Step 1: Create `roll-title-images` Bucket (PUBLIC)

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. Fill in:
   - **Name**: `roll-title-images`
   - **Public bucket**: ✅ **ON** (toggle ON)
   - **File size limit**: 10MB
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/heic`, `image/webp`
4. Click **"Create bucket"**
5. Run policies from `CREATE_ROLL_TITLE_IMAGES_BUCKET.sql`

### Step 2: Update `roll-images` Bucket (Make it PRIVATE)

1. Go to **Supabase Dashboard** → **Storage**
2. Click on **"roll-images"** bucket
3. **IMPORTANT**: Make sure **"Public bucket"** is **OFF** (unchecked)
4. This makes the bucket private, requiring signed URLs for access
5. Run updated policies from `STORAGE_SETUP_UPDATED.sql`

## How It Works

### Title Images (Always Public)
```javascript
// Upload to public bucket
const url = await uploadRollTitleImage(rollId, imagePath, base64);
// Returns: https://...supabase.co/storage/v1/object/public/roll-title-images/{rollId}/title_123.jpg
// No signing needed - always accessible
```

### Roll Images (Conditionally Public)
```javascript
// Upload to private bucket
const url = await uploadRollImage(rollId, imagePath, base64);
// Returns: https://...supabase.co/storage/v1/object/public/roll-images/{rollId}/photo_123.jpg
// But this won't work because bucket is private!

// Instead, use async function to get signed URL
const signedUrl = await getRollImageUrlAsync(imageUrl);
// Returns: https://...supabase.co/storage/v1/object/sign/roll-images/...?token=...
// Signed URL expires after 1 hour, access controlled by policies
```

## Access Control Logic

### Title Images
- **Bucket**: `roll-title-images` (PUBLIC)
- **Policy**: Anyone can view, only owners can upload/delete
- **URL**: Public URL (no signing)
- **Access**: Always granted

### Roll Images
- **Bucket**: `roll-images` (PRIVATE)
- **Policy**: 
  - Authenticated users can view if they own/contribute OR release_date passed
  - Anonymous users can view if release_date passed
- **URL**: Signed URL (temporary, expires in 1 hour)
- **Access**: Controlled by release_date and user permissions

## Benefits

✅ **Clear separation**: Different buckets for different access patterns  
✅ **Proper security**: Roll images protected until release date  
✅ **Simpler policies**: Each bucket has focused, specific policies  
✅ **No conflicts**: No path parsing issues between image types  
✅ **Better performance**: Policies are more specific and efficient  

## Migration Checklist

- [ ] Create `roll-title-images` bucket (PUBLIC)
- [ ] Run `CREATE_ROLL_TITLE_IMAGES_BUCKET.sql` policies
- [ ] Make `roll-images` bucket PRIVATE (uncheck "Public bucket")
- [ ] Run `STORAGE_SETUP_UPDATED.sql` policies
- [ ] Update app code to use `getRollImageUrlAsync()` for roll images
- [ ] Test title image uploads (should go to public bucket)
- [ ] Test roll image uploads (should go to private bucket)
- [ ] Test signed URL generation for roll images
- [ ] Verify title images load immediately
- [ ] Verify roll images respect release_date

## Troubleshooting

### Title images not loading
- Check that `roll-title-images` bucket exists and is PUBLIC
- Verify policies are set up correctly
- Check that URL uses `/roll-title-images/` bucket

### Roll images not loading
- Check that `roll-images` bucket is PRIVATE
- Verify you're using `getRollImageUrlAsync()` to get signed URLs
- Check that signed URLs are being generated (not public URLs)
- Verify release_date logic is working

### "Permission denied" errors
- Check bucket visibility settings (title-images = public, roll-images = private)
- Verify storage policies are correctly set up
- Check that user has proper permissions (owner/contributor)
