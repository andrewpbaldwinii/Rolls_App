# Following System and Profile Privacy Implementation

## Overview
This implementation adds a complete following system and profile privacy controls to the Rolls app.

## Features Implemented

### 1. Following System
- **Connection between accounts**: Users can follow/unfollow other users
- **Follow status**: Tracked in `follows` table (already exists)
- **Newsfeed prioritization**: Content from followed users appears first in the newsfeed

### 2. Profile Privacy
- **Public/Private toggle**: Users can toggle their profile privacy on ProfileScreen
- **Private profile behavior**: 
  - Non-followers cannot see photos grid
  - Non-followers cannot see rolls
  - Even if individual photos/rolls are marked public, they're hidden if profile is private
- **Public profile behavior**: Anyone can view (existing behavior)

## Database Changes

### New Column
- `users.profile_is_public` (BOOLEAN, default TRUE)
  - `TRUE`: Public profile (anyone can view)
  - `FALSE`: Private profile (only followers can view)

### Migration File
Run `ADD_PROFILE_PRIVACY.sql` in Supabase SQL Editor to add the column.

## Code Changes

### 1. ProfileScreen.js
- Added `profileIsPublic` state
- Added `handleToggleProfilePrivacy` function
- Added privacy toggle switch in Account Settings section
- Shows helpful text explaining public vs private

### 2. PublicProfileScreen.js
- Added privacy check on profile load
- Shows locked profile UI if private and not following
- Passes `currentUserId` to `getPublicRolls` and `getPublicPhotos`
- Locked profile shows:
  - Lock icon
  - "This profile is private" message
  - Follow button to request access

### 3. publicProfile.js
- Updated `getPublicRolls()` to accept `currentUserId` parameter
- Updated `getPublicPhotos()` to accept `currentUserId` parameter
- Both functions now check profile privacy:
  - If private and not following → return empty array
  - If private and following → return content
  - If public → return content (existing behavior)

### 4. newsfeed.js
- Updated `getNewsfeedItems()` to accept `currentUserId` parameter
- Fetches list of followed users
- Sorts newsfeed items: followed users first, then others
- Within each group, sorted by date (newest first)

### 5. HomeScreen.js
- Updated to pass `user?.id` to `getNewsfeedItems()` for prioritization

## User Flow

### Making Profile Private
1. User goes to ProfileScreen
2. Toggles "Public Profile" switch OFF
3. Profile becomes private
4. Non-followers see locked profile

### Following a User
1. User views another user's profile
2. If profile is private, sees locked screen with "Follow" button
3. Clicks "Follow" button
4. Connection is created in `follows` table
5. User can now see the private profile

### Newsfeed Prioritization
1. User opens newsfeed
2. Content from followed users appears first
3. Then content from other users
4. All sorted by date within each group

## Testing Checklist

- [ ] Run `ADD_PROFILE_PRIVACY.sql` in Supabase
- [ ] Toggle profile privacy on ProfileScreen
- [ ] View private profile as non-follower (should see locked screen)
- [ ] Follow a private profile user
- [ ] Verify you can now see their content
- [ ] Check newsfeed prioritization (followed users first)
- [ ] Verify public profiles still work for everyone
- [ ] Test that private profile hides rolls even if marked public
- [ ] Test that private profile hides photos even if marked public

## Important Notes

1. **Default behavior**: All existing users default to public profiles
2. **Roll privacy vs Profile privacy**: 
   - Profile privacy overrides roll privacy
   - If profile is private, rolls are hidden even if `is_public = TRUE`
3. **Photo privacy vs Profile privacy**:
   - Profile privacy overrides photo privacy
   - If profile is private, photos are hidden even if from public rolls
4. **Own profile**: Users always see their own profile regardless of privacy setting
