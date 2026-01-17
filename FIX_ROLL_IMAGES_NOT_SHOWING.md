# Fix: Roll Images Not Showing After Upload

## Problem
- Images upload successfully to Supabase Storage ✅
- Images are inserted into `roll_images` table ✅  
- Images appear in Supabase database ✅
- **BUT** images don't show on roll detail screen ❌
- Photo count doesn't display ❌
- Public profile doesn't show photo count ❌

## Root Cause
The issue is likely with the **RLS (Row Level Security) policy** on the `roll_images` table. The SELECT policy may be too restrictive or incorrectly structured, preventing users from viewing their own images even though they can insert them.

## Solution

### Step 1: Fix RLS Policy
Run this SQL script in Supabase SQL Editor:

```sql
-- File: FIX_ROLL_IMAGES_RLS.sql
```

This will:
1. Drop the existing SELECT policy
2. Create a new, properly structured policy that allows:
   - Roll owners to view all images in their rolls
   - Contributors to view images in rolls they contribute to
   - Public viewing when release_date has passed (or is null)

### Step 2: Verify the Fix
After running the SQL script, check the console logs when viewing a roll detail screen. You should see:
- `🔍 Fetching roll images for rollId: [id]`
- `📊 Raw image data count (before filter): [number]`
- `📊 Filtered image data count (after filter): [number]`

### Step 3: Test
1. Go to a roll that has uploaded images
2. Check the roll detail screen
3. Images should now appear
4. Photo count should display correctly

## Additional Debugging

If images still don't show after fixing the RLS policy, check:

1. **Console Logs**: Look for error messages in the Metro bundler console
2. **Database Query**: Run this in Supabase SQL Editor to verify images exist:
   ```sql
   SELECT id, roll_id, image_url, contributor_id, caption, created_at
   FROM roll_images
   WHERE roll_id = '[YOUR_ROLL_ID]'
   ORDER BY created_at DESC;
   ```

3. **RLS Policy Check**: Verify the policy exists:
   ```sql
   SELECT policyname, cmd, qual
   FROM pg_policies
   WHERE tablename = 'roll_images' 
   AND policyname = 'Users can view images in accessible Rolls';
   ```

4. **User Permissions**: Verify you're authenticated:
   - Check that `user.id` matches `contributor_id` in `roll_images`
   - Check that you're the owner or contributor of the roll

## What Changed in Code

1. **RollDetailScreen.js**: Added better debugging and changed the caption filter to use JavaScript `.filter()` instead of `.neq()` to handle null values better
2. **FIX_ROLL_IMAGES_RLS.sql**: Created a new RLS policy with proper structure

## Expected Behavior After Fix

- ✅ Images uploaded from camera appear on roll detail screen
- ✅ Photo count displays correctly
- ✅ Images show even if release_date hasn't passed (for owners/contributors)
- ✅ Public profile shows correct photo count
- ✅ Images are locked (show lock icon) until release_date for non-owners
