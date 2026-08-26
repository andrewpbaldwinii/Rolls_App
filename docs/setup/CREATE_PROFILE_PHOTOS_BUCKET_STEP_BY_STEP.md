# Create Profile Photos Bucket - Step by Step Guide

Follow these exact steps to create the `profile-photos` bucket in Supabase.

## Part 1: Create the Bucket

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in if needed
3. Select your project

### Step 2: Navigate to Storage
1. In the left sidebar, click **"Storage"**
2. You should see a list of existing buckets (like `roll-images`, `profile-images`, etc.)

### Step 3: Create New Bucket
1. Click the **"New bucket"** button (usually at the top right or in the buckets list)
2. A dialog/form will appear

### Step 4: Fill in Bucket Details
1. **Name**: Type exactly: `profile-photos`
   - ⚠️ Important: Use a hyphen, not an underscore
   - ✅ Correct: `profile-photos`
   - ❌ Wrong: `profile_photos` or `profilephotos`

2. **Public bucket**: Toggle this **ON** ✅
   - This makes photos publicly viewable (like Instagram posts)
   - The toggle should be green/checked

3. **File size limit** (optional): Leave default or set to your preference

### Step 5: Create the Bucket
1. Click **"Create bucket"** or **"Save"**
2. You should see the new `profile-photos` bucket in your list
3. ✅ Bucket created!

---

## Part 2: Set Up Storage Policies

Now we need to create 4 policies to control who can upload, view, update, and delete photos.

### Step 1: Open the Bucket Policies
1. Click on the **`profile-photos`** bucket (click its name)
2. Click the **"Policies"** tab at the top
3. You should see an empty policies list (or existing policies if any)

### Step 2: Create Policy 1 - Upload (INSERT)

1. Click **"New Policy"** or **"Create Policy"**
2. Choose **"For full customization"** or **"Custom policy"**
3. Fill in:
   - **Policy Name**: `Users can upload their own profile photos`
   - **Allowed Operation**: Select **`INSERT`**
   - **Target roles**: Select **`authenticated`**
   - **Policy definition**: Choose **"WITH CHECK expression"**
   - **WITH CHECK expression**: Paste this:
     ```sql
     bucket_id = 'profile-photos' AND (string_to_array(name, '/'))[1] = auth.uid()::text
     ```
4. Click **"Review"** then **"Save policy"**

### Step 3: Create Policy 2 - View (SELECT)

1. Click **"New Policy"** again
2. Fill in:
   - **Policy Name**: `Anyone can view profile photos`
   - **Allowed Operation**: Select **`SELECT`**
   - **Target roles**: Select **`authenticated`** AND **`anon`** (both)
   - **Policy definition**: Choose **"USING expression"**
   - **USING expression**: Paste this:
     ```sql
     bucket_id = 'profile-photos'
     ```
3. Click **"Review"** then **"Save policy"**

### Step 4: Create Policy 3 - Update (UPDATE)

1. Click **"New Policy"** again
2. Fill in:
   - **Policy Name**: `Users can update their own profile photos`
   - **Allowed Operation**: Select **`UPDATE`**
   - **Target roles**: Select **`authenticated`**
   - **Policy definition**: Choose **"USING expression"**
   - **USING expression**: Paste this:
     ```sql
     bucket_id = 'profile-photos' AND (string_to_array(name, '/'))[1] = auth.uid()::text
     ```
3. Click **"Review"** then **"Save policy"**

### Step 5: Create Policy 4 - Delete (DELETE)

1. Click **"New Policy"** again
2. Fill in:
   - **Policy Name**: `Users can delete their own profile photos`
   - **Allowed Operation**: Select **`DELETE`**
   - **Target roles**: Select **`authenticated`**
   - **Policy definition**: Choose **"USING expression"**
   - **USING expression**: Paste this:
     ```sql
     bucket_id = 'profile-photos' AND (string_to_array(name, '/'))[1] = auth.uid()::text
     ```
3. Click **"Review"** then **"Save policy"**

---

## Part 3: Verify Setup

### Check Your Bucket
1. Go back to Storage → Buckets
2. You should see `profile-photos` in the list
3. It should show as **Public** ✅

### Check Your Policies
1. Click on `profile-photos` bucket → Policies tab
2. You should see 4 policies:
   - ✅ Users can upload their own profile photos (INSERT)
   - ✅ Anyone can view profile photos (SELECT)
   - ✅ Users can update their own profile photos (UPDATE)
   - ✅ Users can delete their own profile photos (DELETE)

### Test It
1. Go back to your app
2. Navigate to your profile
3. Click the plus sign (+) in the Photos tab
4. Select and upload a photo
5. It should work! ✅

---

## Troubleshooting

### "Bucket already exists"
- The bucket might already exist from a previous attempt
- You can either:
  - Use the existing bucket (skip creation)
  - Or delete it and recreate it

### "Policy already exists"
- A policy with that name already exists
- You can either:
  - Edit the existing policy
  - Or delete it and recreate it

### Upload fails with "permission denied"
- Check that all 4 policies are created
- Make sure the bucket is set to **Public**
- Verify you're logged in to the app (authenticated user)

### Can't find "New Policy" button
- Make sure you're in the **Policies** tab (not Overview or Files)
- The button might be labeled "Create Policy" or have a "+" icon

---

## Quick Reference

**Bucket Name**: `profile-photos`  
**Public**: ✅ ON  
**Policies Needed**: 4 (INSERT, SELECT, UPDATE, DELETE)  
**Path Format**: `{userId}/photo_1234567890.jpg`

You're all set! 🎉

