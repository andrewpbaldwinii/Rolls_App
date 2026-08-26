# Setup Profile Photos Bucket

## Overview
The app now supports standalone public profile photos that are NOT attached to any roll. These photos use a **separate bucket** called `profile-photos` (like Instagram posts).

## IMPORTANT: Create New Bucket

**You need to create a NEW bucket** - don't modify the roll-images bucket!

### Step 1: Create the Profile Photos Bucket

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **"Storage"** in the left sidebar
4. Click **"New bucket"**
5. Fill in:
   - **Name**: `profile-photos`
   - **Public bucket**: ✅ **ON** (toggle this ON)
6. Click **"Create bucket"**

### Step 2: Set Up Storage Policies

After creating the bucket, go to the **Policies** tab and create these policies:

#### Policy 1: Users can upload their own profile photos
- **Policy Name**: `Users can upload their own profile photos`
- **Allowed Operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
```sql
bucket_id = 'profile-photos' AND (string_to_array(name, '/'))[1] = auth.uid()::text
```

#### Policy 2: Anyone can view profile photos
- **Policy Name**: `Anyone can view profile photos`
- **Allowed Operation**: `SELECT`
- **Target roles**: `authenticated, anon`
- **USING expression**:
```sql
bucket_id = 'profile-photos'
```

#### Policy 3: Users can delete their own profile photos
- **Policy Name**: `Users can delete their own profile photos`
- **Allowed Operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'profile-photos' AND (string_to_array(name, '/'))[1] = auth.uid()::text
```

### Step 3: Verify It Worked
1. Go back to your app
2. Try uploading a photo via the plus sign (+) on your profile
3. It should work now!

## What This Does

- **Separate bucket**: `profile-photos` for standalone public photos (like Instagram posts)
- **Path format**: `{userId}/photo_1234567890.jpg` (simple, no prefix needed)
- **Public by default**: All photos in this bucket are public and viewable

## Bucket Organization

- **`roll-images`**: For photos attached to rolls (group albums)
- **`profile-images`**: For user avatar/profile pictures  
- **`profile-photos`**: For standalone public profile photos ✨ NEW

## Troubleshooting

### If upload fails:
- Make sure the `profile-photos` bucket exists
- Make sure it's set to **Public** (toggle ON)
- Make sure all 3 policies are created
- Check the error message in the app console

### If you see "bucket not found":
- The bucket name must be exactly: `profile-photos` (with hyphen)
- Make sure you created it in the correct Supabase project

