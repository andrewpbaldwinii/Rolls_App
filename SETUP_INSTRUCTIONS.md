# Complete Supabase Setup Instructions

## 🎯 What We're Building

Your Rolls app needs **5 tables total**:
1. `auth.users` - Already exists (Supabase manages this)
2. `public.users` - User profiles (username, avatar, etc.)
3. `rolls` - Your photo albums (already exists)
4. `roll_contributors` - Who can add photos to rolls
5. `roll_images` - The actual photos

## 📋 Step-by-Step Setup

### Step 1: Run the Complete Setup Script

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open the file: `COMPLETE_DATABASE_SETUP.sql`
3. **Copy the entire contents** and paste into SQL Editor
4. Click **"Run"** (or press Ctrl+Enter)

This single script will:
- ✅ Create/update `public.users` table
- ✅ Fix the `rolls` foreign key constraint
- ✅ Create `roll_contributors` table
- ✅ Create `roll_images` table
- ✅ Set up all security policies
- ✅ Create a profile for your existing user

### Step 2: Create Storage Bucket (for photos)

1. In Supabase Dashboard, go to **Storage**
2. Click **"New bucket"**
3. Name it: `roll-images`
4. Make it **Public** (so photos can be viewed)
5. Click **"Create bucket"**

### Step 3: Set Storage Policies

Run this in SQL Editor:

```sql
-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'roll-images');

-- Allow anyone to view images (since bucket is public)
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'roll-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'roll-images');
```

## ✅ Verification

After running everything, verify it worked:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'rolls', 'roll_contributors', 'roll_images')
ORDER BY table_name;

-- Check your user profile exists
SELECT id, username, display_name FROM public.users;

-- Check rolls table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rolls';
```

## 🎉 You're Done!

After this setup:
- ✅ All tables are created
- ✅ Foreign keys are correct
- ✅ Security policies are set
- ✅ Storage is configured
- ✅ Your app should work!

## 📚 Understanding the Structure

See `DATABASE_OVERVIEW.md` for a detailed explanation of why each table exists and how they relate to each other.

