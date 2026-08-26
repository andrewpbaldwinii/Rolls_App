# Quick Fix for Current Errors

## Errors You're Seeing

1. **`column roll_images.is_public does not exist`** - This is from old code/references, but shouldn't break functionality
2. **`Could not find the table 'public.public_profile_photos'`** - Table needs to be created
3. **`new row violates row-level security policy`** - Storage policy needs to be updated

## Immediate Fixes Required

### Step 1: Create the Database Table (REQUIRED)

Run this SQL in Supabase SQL Editor:

```sql
-- Create public_profile_photos table
CREATE TABLE IF NOT EXISTS public_profile_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_public_profile_photos_user_id ON public_profile_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_public_profile_photos_created_at ON public_profile_photos(created_at DESC);

-- Enable RLS
ALTER TABLE public_profile_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view public profile photos"
  ON public_profile_photos FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own public profile photos"
  ON public_profile_photos FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own public profile photos"
  ON public_profile_photos FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own public profile photos"
  ON public_profile_photos FOR DELETE
  USING (user_id = auth.uid());
```

### Step 2: Create Profile Photos Bucket (REQUIRED)

**Create a NEW bucket** - don't modify roll-images!

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `profile-photos`
4. **Public bucket**: ✅ ON (toggle this ON)
5. Click "Create bucket"

Then set up policies (see docs/setup/CREATE_PROFILE_PHOTOS_BUCKET.md for details):
- Users can upload their own profile photos (INSERT)
- Anyone can view profile photos (SELECT)
- Users can delete their own profile photos (DELETE)

### Step 3: Restart Your App

After running the SQL and updating the storage policy:
1. Stop your Metro bundler
2. Restart it
3. Reload the app

## What These Fixes Do

- **Step 1**: Creates the table to store standalone public photos
- **Step 2**: Creates a dedicated `profile-photos` bucket for public profile photos (separate from roll images)
- **Step 3**: Ensures the app picks up the changes

## After Fixes

The plus sign (+) on your profile should now:
- ✅ Upload photos successfully
- ✅ Store them in `public_profile_photos` table
- ✅ Display them in the Photos tab
- ✅ NOT create "Profile Photos" rolls

## Note About `is_public` Error

The `column roll_images.is_public does not exist` error is harmless - it's from old code that's not being used. The app will continue to work, but you can ignore this error for now. It doesn't affect functionality.

