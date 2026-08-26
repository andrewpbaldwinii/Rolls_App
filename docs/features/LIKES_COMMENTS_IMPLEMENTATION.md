# Likes and Comments Implementation

## Overview

Added like and comment functionality to the newsfeed and public profile screens. Users can now like and comment on photos from both locations.

## Database Setup (Required First Step)

Before using the like/comment features, you need to create the database tables:

1. **Go to Supabase Dashboard → SQL Editor**
2. **Run the SQL script**: `CREATE_LIKES_COMMENTS_TABLES.sql`
3. This creates:
   - `photo_likes` table - tracks likes on photos
   - `photo_comments` table - stores comments on photos
   - RLS policies allowing public read, authenticated write
   - Users can like/comment on their own photos

## Features Implemented

### 1. Newsfeed Like/Comment (HomeScreen)

**What's Added:**
- Like button (heart icon) on each newsfeed item
- Comment button (chat bubble icon) on each newsfeed item
- Like count display next to like button
- Comment count display next to comment button
- Tapping comment button navigates to PhotoViewerScreen

**How It Works:**
- Likes are tracked per photo and per user
- Like button toggles between filled (liked) and outline (not liked)
- Counts update in real-time
- Users can like their own photos

### 2. Photo Viewer Screen (PhotoViewerScreen)

**What's New:**
- Full-screen photo viewer with horizontal scroll/pagination
- Navigate between photos by swiping left/right
- Shows current photo index (e.g., "3 / 12")
- Like/Comment buttons at the bottom
- Comments section that can be toggled open/closed
- Comment input for adding new comments
- Displays existing comments with user info and timestamps

**Features:**
- **Pagination**: Swipe left/right to navigate between photos
- **Like**: Tap heart icon to like/unlike (updates count immediately)
- **Comments**: Tap chat bubble to show/hide comments section
- **Add Comment**: Type in input field and tap send button
- **Comment List**: Shows all comments with username, text, and time
- **Users can like/comment on their own photos**

### 3. Public Profile Navigation

**What's Added:**
- Tapping a photo in the public profile grid navigates to PhotoViewerScreen
- PhotoViewerScreen opens at the selected photo
- Can swipe through all user's public photos
- Like/Comment available from the viewer

## Files Created/Modified

### New Files:
1. **`CREATE_LIKES_COMMENTS_TABLES.sql`** - Database schema for likes and comments
2. **`src/services/interactions.js`** - API functions for likes and comments
3. **`src/screens/PhotoViewerScreen.js`** - Full-screen photo viewer component

### Modified Files:
1. **`src/screens/HomeScreen.js`** - Added Like/Comment buttons to newsfeed items
2. **`src/navigation/MainNavigator.js`** - Added PhotoViewerScreen route
3. **`src/screens/PublicProfileScreen.js`** - Added navigation to PhotoViewerScreen

## API Functions (interactions.js)

### Likes:
- `likePhoto(photoId, photoType, userId)` - Like a photo
- `unlikePhoto(photoId, photoType, userId)` - Unlike a photo
- `hasUserLikedPhoto(photoId, photoType, userId)` - Check if user liked
- `getPhotoLikeCount(photoId, photoType)` - Get like count
- `getPhotosLikeStatus(photos, userId)` - Batch check likes for multiple photos

### Comments:
- `addComment(photoId, photoType, userId, commentText)` - Add a comment
- `getPhotoComments(photoId, photoType, options)` - Get comments for a photo
- `deleteComment(commentId, userId)` - Delete a comment (only own comments)
- `getPhotoCommentCount(photoId, photoType)` - Get comment count

## Photo Types

The system supports two photo types:
- `PHOTO_TYPES.PROFILE_PHOTO` - Photos from `public_profile_photos` table
- `PHOTO_TYPES.ROLL_IMAGE` - Photos from `roll_images` table

## Usage

### From Newsfeed:
1. View photos in the newsfeed
2. Tap heart icon to like/unlike
3. Tap comment icon to open PhotoViewerScreen with comments

### From Public Profile:
1. Navigate to a user's public profile
2. Tap any photo in the grid
3. PhotoViewerScreen opens showing that photo
4. Swipe left/right to view other photos
5. Like/Comment from the viewer

### In Photo Viewer:
1. Swipe left/right to navigate between photos
2. Tap heart to like/unlike the current photo
3. Tap comment bubble to show/hide comments
4. Type comment and tap send to add a comment
5. View all comments with usernames and timestamps

## Notes

- Users can like and comment on their own photos
- All interactions are public (anyone can see likes/comments)
- Comments are displayed chronologically (oldest first)
- Like counts update immediately after liking/unliking
- Comment counts update after adding a comment
- Photo viewer supports pagination through all user photos

## Testing

1. **Run the SQL script** to create tables
2. **Take some photos** or view existing photos
3. **Like a photo** from newsfeed (tap heart icon)
4. **Comment on a photo** from newsfeed (tap comment icon)
5. **Open a photo** from public profile grid
6. **Swipe between photos** in the viewer
7. **Like/Comment** from the photo viewer

## Troubleshooting

If likes/comments don't work:
- Make sure you ran `CREATE_LIKES_COMMENTS_TABLES.sql` in Supabase
- Check that RLS policies are created (the SQL script includes them)
- Verify you're logged in (likes/comments require authentication)
- Check console logs for any errors
