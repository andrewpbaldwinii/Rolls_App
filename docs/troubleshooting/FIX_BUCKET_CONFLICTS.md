# Fix: Title Images vs Roll Images Bucket Conflicts

## The Problem

You're experiencing conflicts because:
1. **Title images** need to be **always public** (immediately visible)
2. **Roll images** need to be **conditionally public** (locked until `release_date`)

When both are in the same bucket, you can't have different access patterns.

## The Solution: YES, Use Two Separate Buckets!

Even though they're on the same screen (`RollDetailScreen`), they should be in **separate buckets** because they have fundamentally different access requirements.

### Bucket Configuration

| Bucket | Visibility | Access Pattern | URL Type |
|--------|-----------|----------------|----------|
| `roll-title-images` | **PUBLIC** | Always accessible | Public URLs |
| `roll-images` | **PRIVATE** | Conditionally accessible | Signed URLs |

## Why This Works

1. **Title images** in public bucket → Always accessible, no authentication needed
2. **Roll images** in private bucket → Access controlled via signed URLs based on `release_date`
3. **Same screen, different buckets** → No conflict because they're completely separate storage locations

## Setup Steps

### Step 1: Create `roll-title-images` Bucket (PUBLIC)

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. Name: `roll-title-images`
4. **Public bucket**: ✅ **ON** (toggle ON)
5. Click **"Create bucket"**
6. Run `CREATE_ROLL_TITLE_IMAGES_BUCKET.sql` for policies

### Step 2: Make `roll-images` Bucket PRIVATE

1. Go to **Supabase Dashboard** → **Storage**
2. Click on **"roll-images"** bucket
3. **IMPORTANT**: Uncheck **"Public bucket"** (make it PRIVATE)
4. Run `STORAGE_SETUP_UPDATED.sql` for updated policies

### Step 3: Verify Code is Using Correct Functions

Your code already uses:
- ✅ `uploadRollTitleImage()` → Uploads to `roll-title-images` (public)
- ✅ `uploadRollImage()` → Uploads to `roll-images` (private)
- ✅ `getRollImageUrlAsync()` → Generates signed URLs for roll images, public URLs for title images

## How Access Control Works

### Title Images (Always Public)
```
Bucket: roll-title-images (PUBLIC)
URL: https://...supabase.co/storage/v1/object/public/roll-title-images/{rollId}/title_123.jpg
Access: Always granted, no authentication needed
```

### Roll Images (Conditionally Public)
```
Bucket: roll-images (PRIVATE)
URL: https://...supabase.co/storage/v1/object/sign/roll-images/{rollId}/photo_123.jpg?token=...
Access: Controlled by:
  - User owns/contributes to roll → Always accessible
  - release_date has passed → Accessible to everyone
  - release_date not set → Accessible to everyone
  - Otherwise → Not accessible
```

## Benefits of Separation

✅ **No conflicts**: Different buckets = different access patterns  
✅ **Proper security**: Roll images protected until release date  
✅ **Simpler policies**: Each bucket has focused, specific policies  
✅ **Better performance**: More efficient policy checks  
✅ **Clear separation**: Easy to understand and maintain  

## Your Code Already Supports This!

Looking at your code:
- `RollDetailScreen.js` already uses `getRollImageUrlAsync()` for both types
- `storage.js` already has separate upload functions
- The async function already handles both buckets correctly

**You just need to:**
1. Create the `roll-title-images` bucket (PUBLIC)
2. Make `roll-images` bucket PRIVATE
3. Run the updated SQL policies

## Testing

After setup, test:

1. **Title image upload** → Should go to `roll-title-images` bucket, get public URL
2. **Roll image upload** → Should go to `roll-images` bucket, get signed URL
3. **Title image display** → Should load immediately (public URL)
4. **Roll image display** → Should use signed URL, respect `release_date`

## Summary

**YES, use two separate buckets!** This is the correct architecture because:
- They have different access requirements
- They're on the same screen but serve different purposes
- Separation eliminates conflicts and simplifies policies
- Your code already supports this architecture

The key is making `roll-images` **PRIVATE** (not public) so signed URLs can properly control access based on `release_date`.
