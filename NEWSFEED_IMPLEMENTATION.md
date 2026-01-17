# Newsfeed Implementation

## Overview

A chronological newsfeed has been implemented on the Home screen that displays:
1. **Public profile photos** - Standalone photos uploaded to public profiles
2. **Public roll images** - Images from public rolls that have been developed (release_date has passed)

## Features

✅ **Chronological Algorithm** - Newest posts appear first  
✅ **Pagination** - Loads 20 items per page  
✅ **Infinite Scroll** - Automatically loads more as user scrolls  
✅ **Pull to Refresh** - Swipe down to refresh the feed  
✅ **User Profiles** - Tap on user info to view their public profile  
✅ **Roll Navigation** - Tap on roll images to view the roll detail  
✅ **Image Loading** - Handles signed URLs for private roll images  
✅ **Error Handling** - Graceful error handling and empty states  

## Files Created/Modified

### New Files
- `src/services/newsfeed.js` - Newsfeed service with pagination logic

### Modified Files
- `src/screens/HomeScreen.js` - Complete newsfeed UI implementation

## How It Works

### Data Sources

1. **Public Profile Photos** (`public_profile_photos` table)
   - Standalone photos not attached to any roll
   - Always public and visible immediately

2. **Public Roll Images** (`roll_images` table)
   - Only from rolls where `is_public = true`
   - Only where `release_date` has passed (or is null)
   - Excludes title images (stored separately)

### Query Logic

The newsfeed service:
1. Fetches public profile photos with user info
2. Fetches roll images from public, developed rolls
3. Combines and sorts by `created_at` (newest first)
4. Applies pagination (20 items per page)
5. Processes image URLs (signed URLs for roll images, public URLs for profile photos)

### Pagination

- **Page Size**: 20 items per page
- **Initial Load**: First 20 items
- **Load More**: Triggered when user scrolls near bottom (50% threshold)
- **Has More**: Determined by checking if total items exceed current page

## UI Components

### Feed Item Structure
```
┌─────────────────────────┐
│ [Avatar] Username        │  ← User header (tappable)
│         Roll Title        │
├─────────────────────────┤
│                         │
│      Image (Square)      │  ← Image (tappable for rolls)
│                         │
├─────────────────────────┤
│ Username Caption text... │  ← Caption (if exists)
├─────────────────────────┤
│ 2 hours ago             │  ← Timestamp
└─────────────────────────┘
```

### Features
- **User Header**: Shows avatar, username, and roll title (for roll images)
- **Square Images**: Full-width square images (Instagram-style)
- **Captions**: Displayed below image with username prefix
- **Timestamps**: Relative time (e.g., "2 hours ago", "3 days ago")
- **Loading States**: Activity indicators for initial load and pagination
- **Empty State**: Friendly message when no posts exist

## Navigation

- **Tap User Info**: Navigates to `PublicProfile` screen
- **Tap Roll Image**: Navigates to `RollDetail` screen
- **Pull to Refresh**: Reloads feed from beginning

## Image URL Handling

### Profile Photos
- Stored in `public_profile_photos` table
- May be in `profile-images` bucket (public)
- Uses public URLs (no signing needed)

### Roll Images
- Stored in `roll_images` table
- In `roll-images` bucket (private)
- Uses signed URLs (temporary, access-controlled)
- Generated via `getRollImageUrlAsync()` function

## Performance Considerations

1. **Pagination**: Only loads 20 items at a time
2. **Image Processing**: Processes URLs in parallel with `Promise.all()`
3. **Lazy Loading**: Images load as user scrolls
4. **Error Handling**: Graceful fallbacks if queries fail

## Database Requirements

The newsfeed requires:
- `public_profile_photos` table (optional - handles gracefully if missing)
- `roll_images` table with `rolls` relationship
- `rolls` table with `is_public` and `release_date` columns
- `users` table for user info

## Testing Checklist

- [ ] Newsfeed loads on Home screen
- [ ] Public profile photos appear
- [ ] Public roll images appear (only after release_date)
- [ ] Pagination works (scroll to load more)
- [ ] Pull to refresh works
- [ ] Tap user info navigates to profile
- [ ] Tap roll image navigates to roll detail
- [ ] Images load correctly (signed URLs for rolls)
- [ ] Empty state shows when no posts
- [ ] Error handling works gracefully

## Future Enhancements

Potential improvements:
- Like/comment functionality
- Share functionality
- Filter by user (following)
- Search functionality
- Stories/Highlights
- Video support
