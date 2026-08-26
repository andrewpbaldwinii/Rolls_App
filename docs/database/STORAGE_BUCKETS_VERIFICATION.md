# Storage Buckets Verification

## Current Setup ✅

Your app is correctly configured with **two separate buckets**:

### 1. `roll-images` Bucket
- **Used by:** `uploadRollImage()` function in `src/services/storage.js`
- **Purpose:** Camera photos uploaded to rolls
- **Locked until:** Release date (enforced at application level)
- **Path format:** `{rollId}/photo_{timestamp}.jpg`
- **Database:** Stored in `roll_images` table

### 2. `roll-title-images` Bucket  
- **Used by:** `uploadRollTitleImage()` function in `src/services/storage.js`
- **Purpose:** Title images for rolls (from phone library)
- **Always public:** Yes (visible immediately)
- **Path format:** `{rollId}/title_{timestamp}.jpg`
- **Database:** Stored in `rolls.title_image_url` (NOT in `roll_images` table)

## Code Verification ✅

All references are correct:
- ✅ `uploadRollImage()` → uses `roll-images` bucket
- ✅ `uploadRollTitleImage()` → uses `roll-title-images` bucket
- ✅ `deleteRollImage()` → handles both buckets correctly
- ✅ `getRollImageUrl()` → handles both buckets correctly

## Setup Checklist

### For `roll-images` bucket:
- [ ] Bucket created in Supabase Dashboard
- [ ] Bucket is **PRIVATE** (not public)
- [ ] Run `STORAGE_SETUP.sql` to create policies
- [ ] Policies allow:
  - ✅ Contributors can upload to rolls they own/contribute to
  - ✅ Anyone can view (public access via RLS)
  - ✅ Users can delete their own images or from their rolls

### For `roll-title-images` bucket:
- [ ] Bucket created in Supabase Dashboard  
- [ ] Bucket is **PUBLIC** (title images are always visible)
- [ ] Run `CREATE_ROLL_TITLE_IMAGES_BUCKET.sql` to create policies
- [ ] Policies allow:
  - ✅ Roll owners can upload title images
  - ✅ Anyone can view (public bucket)
  - ✅ Roll owners can delete title images

## Quick Verification Queries

Run these in Supabase SQL Editor to verify setup:

```sql
-- Check if both buckets exist
SELECT name, id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name IN ('roll-images', 'roll-title-images')
ORDER BY name;
```

```sql
-- Check policies for both buckets
SELECT 
  name as policy_name,
  bucket_id,
  definition
FROM storage.policies
WHERE bucket_id IN ('roll-images', 'roll-title-images')
ORDER BY bucket_id, name;
```

## Next Steps

1. **If buckets don't exist:** Follow `STORAGE_BUCKETS_SETUP.md` to create them
2. **If policies are missing:** Run the respective SQL setup files
3. **Test the setup:**
   - Take a photo from camera → should upload to `roll-images`
   - Select title image from library → should upload to `roll-title-images`
