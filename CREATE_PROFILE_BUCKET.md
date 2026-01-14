# Create Profile Images Bucket in Supabase

Profile images should be in a separate bucket from roll images for better organization and simpler policies.

## Step 1: Create the Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. Fill in:
   - **Name**: `profile-images`
   - **Public bucket**: ✅ **ON** (so profile images can be viewed)
4. Click **"Create bucket"**

## Step 2: Set Up Storage Policies

After creating the bucket, go to **Policies** tab and create these policies:

### Policy 1: Users can upload their own profile images
- **Policy Name**: `Users can upload profile images`
- **Allowed Operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
```sql
bucket_id = 'profile-images' AND (string_to_array(name, '/'))[1] = auth.uid()::text
```

### Policy 2: Anyone can view profile images
- **Policy Name**: `Anyone can view profile images`
- **Allowed Operation**: `SELECT`
- **Target roles**: `authenticated, anon`
- **USING expression**:
```sql
bucket_id = 'profile-images'
```

### Policy 3: Users can delete their own profile images
- **Policy Name**: `Users can delete their own profile images`
- **Allowed Operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'profile-images' AND (string_to_array(name, '/'))[1] = auth.uid()::text
```

## Step 3: Update the Code

The code will be updated to use the new bucket. The path format will be:
- **Profile images**: `{userId}/profile_1234567890.jpg` (simpler, no "profiles/" prefix needed)

## Benefits

✅ **Cleaner organization** - Profile images separate from roll images
✅ **Simpler policies** - No need to check for "profiles/" prefix
✅ **Better security** - Can set different permissions for each bucket
✅ **Easier management** - Clear separation of concerns

