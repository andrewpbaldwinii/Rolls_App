# Photo Upload Flow Guide

## Current Flow

1. **User takes photo** → CameraScreen captures image
2. **Upload to Storage** → `uploadRollImage()` uploads to Supabase Storage bucket `roll-images`
3. **Add to Database** → `addImageToRoll()` inserts record into `roll_images` table
4. **Image stored** → Image URL stored, associated with roll and contributor

## Setup Required

### 1. Create Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `roll-images`
4. **Make it Public** (toggle ON)
5. Click "Create bucket"

### 2. Run Storage Policies
Run `STORAGE_SETUP.sql` in Supabase SQL Editor to set up:
- Upload permissions (users can upload to rolls they own/contribute to)
- View permissions (anyone can view images)
- Delete permissions (users can delete their own images)

### 3. Verify Setup
Run `VERIFY_STORAGE_SETUP.sql` to check:
- Bucket exists
- Policies are set up
- Table structure is correct
- RLS policies are configured

## Testing the Flow

### Step 1: Create a Roll
1. Go to Rolls tab
2. Create a new roll (e.g., "test")
3. Note the roll ID (check console logs)

### Step 2: Take a Photo
1. Go to Camera tab
2. Select the roll (should auto-select if only one)
3. Take a photo
4. Watch console logs for:
   - "Starting photo upload process..."
   - "Step 1: Uploading image to storage..."
   - "Step 1 complete: Image uploaded"
   - "Step 2: Adding image to roll_images table..."
   - "Step 2 complete: Image added to roll"

### Step 3: Verify Upload
1. Check Supabase Dashboard → Storage → roll-images bucket
2. You should see a folder with the roll ID
3. Inside should be the uploaded image
4. Check Supabase Dashboard → Table Editor → roll_images
5. You should see a new record with the image URL

## Troubleshooting

### Error: "Bucket not found"
- **Solution**: Create the `roll-images` bucket in Supabase Storage

### Error: "Permission denied" or "Policy violation"
- **Solution**: Run `STORAGE_SETUP.sql` to set up storage policies

### Error: "Failed to read file"
- **Solution**: Check file path format. The code handles `file://` prefix automatically

### Error: "Foreign key constraint" when adding to roll_images
- **Solution**: Make sure:
  - The roll exists
  - Your user profile exists (run `COMPLETE_PROFILE_SETUP.sql`)
  - You're a contributor to the roll

### Image uploads but doesn't appear in database
- **Check**: Console logs for "Step 2" errors
- **Verify**: RLS policies allow INSERT on roll_images table

## Console Logs to Watch

When taking a photo, you should see:
```
Starting photo upload process... { rollId: '...', imagePath: '...' }
Starting image upload... { rollId: '...', imagePath: '...' }
Upload path: {rollId}/photo_{timestamp}.jpg
Reading file from: file://...
File read successfully, size: {size} bytes
Uploading to Supabase Storage...
Upload successful, path: {rollId}/photo_{timestamp}.jpg
Public URL: https://...
Step 1 complete: Image uploaded, URL: https://...
Adding image to roll_images table... { rollId: '...', imageUrl: '...', contributorId: '...' }
Image successfully added to roll: { ... }
Step 2 complete: Image added to roll
```

## Next Steps (Future)

Once basic upload works:
1. ✅ Image visibility based on release_date
2. ✅ Show images in roll detail view
3. ✅ Image thumbnails/grid view
4. ✅ Delete images
5. ✅ Image captions

