# Public Profile Photos Fix - Summary

## Problem
- The plus sign (+) on the profile screen was creating a "Profile Photos" roll and attaching images to it
- These images appeared in the Rolls tab, which was incorrect
- Images should be standalone public photos that appear ONLY in the Photos tab

## Solution Implemented

### 1. Created New Database Table
- **File**: `CREATE_PUBLIC_PROFILE_PHOTOS_TABLE.sql`
- **Table**: `public_profile_photos`
- Stores standalone public photos that are NOT attached to any roll
- **Action Required**: Run this SQL file in Supabase SQL Editor

### 2. Updated Upload Functionality
- **File**: `src/services/publicProfile.js`
- Added `uploadPublicProfilePhoto()` function
- Uploads photos directly to `public_profile_photos` table (not to a roll)
- Photos are stored in dedicated `profile-photos` bucket (separate from roll images)
- Storage path format: `{userId}/photo_1234567890.jpg` (simple, no prefix needed)

### 3. Updated Public Profile Screen
- **File**: `src/screens/PublicProfileScreen.js`
- Removed "Profile Photos" roll creation logic
- Plus sign (+) now uploads directly to public photos (no roll involved)
- Photos appear immediately in the Photos tab

### 4. Updated Photo Retrieval
- **File**: `src/services/publicProfile.js`
- `getPublicPhotos()` now includes both:
  - Standalone public profile photos (from `public_profile_photos` table)
  - Photos from public rolls (existing functionality)
- `getPublicRolls()` now excludes "Profile Photos" rolls from the Rolls tab

## Setup Steps Required

### Step 1: Run Database Migration
1. Open Supabase Dashboard → SQL Editor
2. Run the file: `CREATE_PUBLIC_PROFILE_PHOTOS_TABLE.sql`
3. This creates the `public_profile_photos` table with proper RLS policies

### Step 2: Create Profile Photos Bucket
1. Follow instructions in: `CREATE_PROFILE_PHOTOS_BUCKET.md`
2. Create a new `profile-photos` bucket (separate from `roll-images`)
3. Set up storage policies for the new bucket
4. This creates a dedicated space for standalone public photos (like Instagram posts)

### Step 3: Test the Functionality
1. Open your profile screen
2. Click the plus sign (+) in the Photos tab
3. Select an image
4. The image should:
   - Upload successfully
   - Appear in the Photos tab immediately
   - NOT appear in the Rolls tab
   - Be visible on your public profile

## How It Works Now

### Plus Sign (+) Functionality
1. User clicks plus sign (+) on profile screen (Photos tab)
2. Image picker opens
3. User selects an image
4. Image uploads to: `public-photos/{userId}/filename.jpg`
5. Image is inserted into `public_profile_photos` table
6. Image appears immediately in Photos tab grid
7. Image is public and visible on public profile

### What Changed
- ✅ Photos uploaded via plus sign are standalone (not attached to rolls)
- ✅ Photos appear only in Photos tab (not in Rolls tab)
- ✅ "Profile Photos" roll is no longer created
- ✅ Existing "Profile Photos" rolls are filtered out from Rolls tab
- ✅ Photos are immediately public and visible

## Files Modified
1. `CREATE_PUBLIC_PROFILE_PHOTOS_TABLE.sql` (new)
2. `src/services/publicProfile.js` (updated)
3. `src/screens/PublicProfileScreen.js` (updated)
4. `UPDATE_STORAGE_POLICY_FOR_PUBLIC_PHOTOS.md` (new)

## Notes
- Existing photos in "Profile Photos" rolls will still appear in Photos tab (if the roll is public)
- New photos uploaded via plus sign will NOT create or use any roll
- The "Profile Photos" roll will no longer appear in the Rolls tab (filtered out)

