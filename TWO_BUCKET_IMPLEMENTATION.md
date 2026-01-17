# Two-Bucket Image Implementation

## Overview
The app now uses two separate Supabase Storage buckets to handle different types of images with different access requirements:

1. **`roll-title-images`** - Public title images
2. **`roll-images`** - Private roll photos

## Bucket Details

### `roll-title-images` Bucket
- **Purpose**: Aesthetic title images for rolls
- **Access**: Public (always accessible)
- **Source**: User-uploaded images from device library
- **Storage Path**: `{rollId}/{filename}.jpg`
- **URL Type**: Public URLs (no signing required)
- **Display Locations**:
  - Roll Detail Screen (top of screen)
  - Public Profile - Rolls Tab (grid view)

### `roll-images` Bucket
- **Purpose**: Actual roll photos (taken from camera)
- **Access**: Private (requires signed URLs)
- **Source**: Photos taken from CameraScreen
- **Storage Path**: `{rollId}/{filename}.jpg`
- **URL Type**: Signed URLs (1-hour expiry)
- **Access Control**:
  - **Before Development Date**: Only owner and contributors can view
  - **After Development Date**:
    - If roll is **public**: All users can view
    - If roll is **private**: Only contributors can view
- **Display Location**: Roll Detail Screen (grid view)

## Implementation Details

### URL Processing
The `getRollImageUrlAsync()` function in `src/services/storage.js` handles both bucket types:

```javascript
// For title images (public)
const titleUrl = await getRollImageUrlAsync(imageUrl, 'title');

// For roll images (private)
const rollImageUrl = await getRollImageUrlAsync(imageUrl, 'roll');
```

### Roll Detail Screen
- **Title Image**: Uses `roll-title-images` bucket, processed with `bucketType: 'title'`
- **Grid Images**: Uses `roll-images` bucket, processed with `bucketType: 'roll'`
- **Access Control**: Grid images respect development date and privacy settings

### Public Profile Screen
- **Rolls Tab**: Shows title images from `roll-title-images` bucket
- **Title images are always public** and visible to all users

## Access Control Logic

### Roll Images (roll-images bucket)
1. **Owner/Contributors**: Can always view images (even before development date)
2. **Other Users**:
   - Before development date: Cannot view (shows locked placeholder)
   - After development date:
     - Public roll: Can view all images
     - Private roll: Cannot view (only contributors can)

### Title Images (roll-title-images bucket)
- Always public and visible to all users
- No access restrictions

## Migration Notes

### Old Format Support
The code still handles old title images that were stored in `roll-images` bucket with `/title/` path:
- Detects old format automatically
- Generates signed URLs for old title images
- Falls back to new `roll-title-images` bucket format if possible

### New Uploads
- Title images: Automatically uploaded to `roll-title-images` bucket
- Roll images: Automatically uploaded to `roll-images` bucket
- No migration needed for new uploads

## Files Modified

1. **`src/services/storage.js`**:
   - `uploadRollTitleImage()` - Uploads to `roll-title-images` bucket
   - `uploadRollImage()` - Uploads to `roll-images` bucket
   - `getRollImageUrlAsync()` - Handles both bucket types with proper URL generation

2. **`src/screens/RollDetailScreen.js`**:
   - Processes title images with `bucketType: 'title'`
   - Processes roll images with `bucketType: 'roll'`
   - Implements access control for roll images

3. **`src/screens/PublicProfileScreen.js`**:
   - Processes title images for public rolls display
   - Uses `roll-title-images` bucket for title images

## Testing Checklist

- [ ] Title images display on Roll Detail Screen
- [ ] Title images display on Public Profile - Rolls Tab
- [ ] Roll images display correctly based on development date
- [ ] Roll images respect privacy settings (public vs private)
- [ ] Owner/contributors can view images before development date
- [ ] Non-contributors see locked placeholders before development date
- [ ] Public rolls show images to all users after development date
- [ ] Private rolls only show images to contributors after development date
