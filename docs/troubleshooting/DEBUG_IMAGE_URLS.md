# Debug Image URL Issues

## Current Problem
- Roll images are getting HTTP 400 errors
- URLs are public URLs: `https://...supabase.co/storage/v1/object/public/roll-images/...`
- Title images work (they're in the same bucket but different path)
- The bucket appears to be private, so public URLs return 400

## What Should Happen
1. When fetching images, `getRollImageUrlAsync()` should be called
2. It should extract the path from the URL
3. It should generate a signed URL using `createSignedUrl()`
4. The signed URL should be used in the Image component

## Debugging Steps

### 1. Check Console Logs
Look for these messages when loading a roll:
- `🔄 Processing image URLs to generate signed URLs...`
- `🔄 Processing image 1/X:`
- `🔗 Generating signed URL for:`
- `✅ Generated signed URL successfully` OR `⚠️ Signed URL generation failed`

### 2. Check URL Format
The original URLs look like:
```
https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/roll-images/<user-id>/photo_<timestamp>.jpg
```

The path should be extracted as:
```
<user-id>/photo_<timestamp>.jpg
```

### 3. Check Storage Policies
The signed URL generation might be failing due to storage policies. Check:
- Does the `roll-images` bucket allow signed URL generation?
- Are the RLS policies correct for the storage bucket?

### 4. Possible Issues
1. **Path extraction failing**: The path might not be extracted correctly
2. **Signed URL generation failing**: Storage policies might block it
3. **Async processing not completing**: The processed URLs might not be used

## Next Steps
1. Check console logs for the debug messages
2. Verify the path extraction is working
3. Check if signed URL generation is succeeding or failing
4. If failing, check storage policies in Supabase
