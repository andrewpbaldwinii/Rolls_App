# Storage Buckets Setup Guide

This app uses **two separate storage buckets** for different types of images:

## Bucket 1: `roll-images` 
**Purpose:** Camera photos uploaded to rolls (locked until release date)

**Characteristics:**
- Photos taken from the camera screen
- Uploaded via `uploadRollImage()` function
- Stored in `roll_images` table
- **Locked until release_date** - only visible after the roll's release date
- Path format: `{rollId}/photo_{timestamp}.jpg`

**Setup:**
1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `roll-images`
4. **Public:** `false` (private bucket, uses RLS policies)
5. File size limit: 10MB (recommended)
6. Allowed MIME types: `image/jpeg`, `image/png`, `image/heic`, `image/webp`
7. Click "Create bucket"
8. Run `STORAGE_SETUP.sql` to set up policies

**Policies:**
- Contributors can upload images to rolls they own or contribute to
- Anyone can view images (public access via RLS)
- Users can delete images they uploaded or from rolls they own

---

## Bucket 2: `roll-title-images`
**Purpose:** Title images for rolls (uploaded from phone library, always public)

**Characteristics:**
- Images selected from user's phone library
- Uploaded via `uploadRollTitleImage()` function
- Stored in `rolls.title_image_url` (NOT in `roll_images` table)
- **Always public** - visible immediately, not locked by release date
- Path format: `{rollId}/title_{timestamp}.jpg`

**Setup:**
1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `roll-title-images`
4. **Public:** `true` (public bucket - title images are always visible)
5. File size limit: 10MB (recommended)
6. Allowed MIME types: `image/jpeg`, `image/png`, `image/heic`, `image/webp`
7. Click "Create bucket"
8. Run `CREATE_ROLL_TITLE_IMAGES_BUCKET.sql` to set up policies

**Policies:**
- Roll owners can upload title images to their rolls
- Anyone can view title images (public access)
- Roll owners can delete title images from their rolls

---

## Key Differences

| Feature | roll-images | roll-title-images |
|---------|-------------|-------------------|
| **Source** | Camera screen | Phone library |
| **Upload Function** | `uploadRollImage()` | `uploadRollTitleImage()` |
| **Database Table** | `roll_images` | `rolls.title_image_url` |
| **Visibility** | Locked until release_date | Always public |
| **Bucket Type** | Private (RLS) | Public |
| **Path Format** | `{rollId}/photo_*.jpg` | `{rollId}/title_*.jpg` |

---

## Verification

### Check if buckets exist:
```sql
SELECT name, id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name IN ('roll-images', 'roll-title-images');
```

### Check policies:
```sql
SELECT name, bucket_id, definition
FROM storage.policies
WHERE bucket_id IN ('roll-images', 'roll-title-images')
ORDER BY bucket_id, name;
```

---

## Troubleshooting

### Error: "Bucket not found"
- Make sure both buckets are created in Supabase Dashboard
- Check bucket names match exactly: `roll-images` and `roll-title-images`

### Error: "Permission denied" or "Policy violation"
- Run the SQL setup scripts for each bucket
- Verify policies are created correctly using the verification queries above

### Images not showing
- **Roll images:** Check if `release_date` has passed
- **Title images:** Should be visible immediately (always public)
