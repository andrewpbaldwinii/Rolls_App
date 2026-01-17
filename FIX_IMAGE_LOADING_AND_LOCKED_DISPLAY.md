# Fix: Image Loading and Locked Display

## Issues Fixed

### 1. HTTP 400 Errors (Private Bucket)
**Problem:** Images were getting HTTP 400 errors because the `roll-images` bucket is private and public URLs don't work.

**Solution:**
- Updated `getRollImageUrlAsync()` to generate **signed URLs** for private buckets
- Signed URLs work for both public and private buckets
- Improved URL path extraction to handle various URL formats
- Added better logging to debug URL generation

### 2. Locked Image Display
**Problem:** Images weren't showing in the grid before the development date, even for owners/contributors.

**Solution:**
- **Owners/Contributors:** Can always see images (even before release date)
  - Images show with reduced opacity (50%) and a lock overlay
  - This provides visual feedback that images are locked
- **Non-owners:** See grey placeholder squares with lock icon before release date
- **After release date:** All users see full images

### 3. Image Grid Display
**Problem:** Images weren't appearing in the grid at all.

**Solution:**
- Images now always appear in the grid
- Before release: Owners see blurred/locked images, others see placeholders
- After release: Everyone sees full images
- Grid squares always show (no empty spaces)

## Code Changes

### `src/services/storage.js`
- Enhanced `getRollImageUrlAsync()` to:
  - Better extract paths from various URL formats
  - Generate signed URLs for private buckets
  - Add comprehensive logging

### `src/screens/RollDetailScreen.js`
- Added `canViewImages` logic to determine if user can see images
- Updated `renderImageItem()` to:
  - Show images for owners/contributors (with lock overlay if locked)
  - Show placeholders for non-owners before release
  - Always show grid squares
- Added new styles:
  - `imageContainer`: Container for image with overlay
  - `lockedImage`: Reduced opacity for locked images
  - `lockOverlay`: Lock icon overlay for owners before release

## Expected Behavior

1. **Before Development Date:**
   - **Owners/Contributors:** See images with 50% opacity + lock overlay
   - **Others:** See grey placeholder squares with lock icon
   - All grid squares are visible

2. **After Development Date:**
   - **Everyone:** See full images without any locks
   - Images load using signed URLs (works for private buckets)

3. **Image Loading:**
   - All images use signed URLs (generated when fetching)
   - Signed URLs work for both public and private buckets
   - URLs are processed asynchronously when fetching images

## Testing

1. **Check Console Logs:**
   - Look for `🔗 Generating signed URL for:` messages
   - Look for `✅ Generated signed URL successfully` messages
   - Check for any URL extraction warnings

2. **Verify Image Display:**
   - Before release date: Owners should see blurred images with locks
   - Before release date: Non-owners should see grey placeholders
   - After release date: Everyone should see full images
   - All grid squares should be visible

3. **Check for Errors:**
   - No more HTTP 400 errors
   - Images should load successfully
   - Check console for any URL generation errors
