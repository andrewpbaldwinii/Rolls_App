# Public Profile Feature Setup

This document explains how to set up and use the public profile feature in the Rolls app.

## Overview

The public profile feature allows users to:
- Upload a profile image
- Make rolls and photos public
- View public profiles with Instagram-like UI
- Follow/unfollow other users
- See stats: Rolls Created, Photos Taken, and Followers

## Database Setup

1. Run the SQL script in Supabase SQL Editor:
   ```sql
   -- Run PUBLIC_PROFILE_SETUP.sql
   ```

   This will:
   - Add `is_public` flag to `rolls` table
   - Add `is_public` flag to `roll_images` table
   - Create `follows` table for followers/following
   - Update RLS policies to allow public viewing
   - Create function to get user public stats

## Features

### Public Profile Screen

The `PublicProfileScreen` component displays:
- Profile image (uploadable for own profile)
- User stats (Rolls Created, Photos Taken, Followers)
- Toggle between Photos and Rolls view
- Grid view of public photos (Instagram-like)
- Albums view of public rolls
- Follow/Unfollow button (for other users)

### Making Content Public

#### Making a Roll Public

1. Go to the Rolls screen
2. For any roll you own, you'll see a Public/Private toggle in the footer
3. Tap the toggle to make the roll public or private
4. Public rolls will appear on your public profile

#### Making Photos Public

Currently, photos inherit the public status from their roll. To make individual photos public:
- The photo must be in a public roll, OR
- You can add functionality to toggle individual photos (future enhancement)

### Profile Image Upload

To enable profile image upload:

1. Install `react-native-image-picker`:
   ```bash
   npm install react-native-image-picker
   ```

2. For iOS, add to `ios/Podfile`:
   ```ruby
   pod 'RNImagePicker', :path => '../node_modules/react-native-image-picker'
   ```

3. For Android, add permissions to `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
   <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
   ```

4. Uncomment the image picker code in `PublicProfileScreen.js`:
   ```javascript
   import { launchImageLibrary } from 'react-native-image-picker';
   ```

## Navigation

The public profile screen is accessible from:
- Profile Screen → "View Public Profile" button
- Navigation: `navigation.navigate('PublicProfile', { userId: 'user-id' })`

## Service Functions

All public profile functionality is in `src/services/publicProfile.js`:

- `getPublicProfile(userId)` - Get profile data and stats
- `getPublicRolls(userId)` - Get user's public rolls
- `getPublicPhotos(userId)` - Get user's public photos
- `uploadProfileImage(userId, imagePath)` - Upload profile image
- `setRollPublic(rollId, isPublic)` - Make roll public/private
- `setPhotoPublic(imageId, isPublic)` - Make photo public/private
- `followUser(userId)` - Follow a user
- `unfollowUser(userId)` - Unfollow a user
- `isFollowing(userId)` - Check if following a user

## Storage

Profile images are stored in Supabase Storage:
- Bucket: `roll-images` (or create a dedicated `profiles` bucket)
- Path: `profiles/{userId}/{filename}`

## RLS Policies

The setup includes Row Level Security (RLS) policies that:
- Allow anyone to view public rolls and photos
- Allow users to update their own content
- Allow users to follow/unfollow others
- Protect private content from unauthorized access

## Future Enhancements

- Individual photo public/private toggle
- Profile bio editing
- Profile settings screen
- Search for public profiles
- Explore/discover public content

