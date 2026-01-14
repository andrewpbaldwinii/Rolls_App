# Create Profile Photos Bucket in Supabase

Profile photos (standalone public photos like Instagram posts) should be in a separate bucket from roll images for better organization and simpler policies.

## Step 1: Create the Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. Fill in:
   - **Name**: `profile-photos`
   - **Public bucket**: ✅ **ON** (so profile photos can be viewed publicly)
4. Click **"Create bucket"**

## Step 2: Set Up Storage Policies

After creating the bucket, go to the **Policies** tab and create these policies:

### Policy 1: Users can upload their own profile photos
- **Policy Name**: `Users can upload their own profile photos`
- **Allowed Operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
```sql
bucket_id = 'profile-photos' AND (string_to_array(name, '/'))[1] = auth.uid()::text
```

This allows users to upload to paths like: `{userId}/photo_1234567890.jpg`

### Policy 2: Anyone can view profile photos
- **Policy Name**: `Anyone can view profile photos`
- **Allowed Operation**: `SELECT`
- **Target roles**: `authenticated, anon`
- **USING expression**:
```sql
bucket_id = 'profile-photos'
```

### Policy 3: Users can update their own profile photos
- **Policy Name**: `Users can update their own profile photos`
- **Allowed Operation**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'profile-photos' AND (string_to_array(name, '/'))[1] = auth.uid()::text
```

### Policy 4: Users can delete their own profile photos
- **Policy Name**: `Users can delete their own profile photos`
- **Allowed Operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'profile-photos' AND (string_to_array(name, '/'))[1] = auth.uid()::text
```

## Step 3: Verify Setup

After creating the bucket and policies:
1. The bucket should be **public** (toggle ON)
2. You should have 4 policies created
3. Try uploading a photo via the plus sign (+) on your profile
4. It should work!

## Path Format

Profile photos are stored with this format:
- **Path**: `{userId}/photo_1234567890.jpg`
- **Example**: `2cff8f11-16a5-4815-a305-d2fcb69aae7d/photo_1768376312422.jpg`

## Benefits

✅ **Cleaner organization** - Profile photos separate from roll images  
✅ **Simpler policies** - No need to check for special prefixes  
✅ **Better security** - Can set different permissions for each bucket  
✅ **Easier management** - Clear separation of concerns  
✅ **Instagram-like** - Similar to how Instagram separates posts from stories/rolls  

## Bucket Comparison

- **`roll-images`**: For photos attached to rolls (group albums)
- **`profile-images`**: For user avatar/profile pictures
- **`profile-photos`**: For standalone public profile photos (like Instagram posts) ✨ NEW

