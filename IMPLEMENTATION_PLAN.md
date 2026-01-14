# Implementation Plan: Public Data Setup

## 🎯 Goal
Set up database to handle public data (usernames, profile images, roll names) while maintaining security.

## ✅ What I Can Implement (Automated)

### 1. SQL Scripts ✅
- [x] `COMPLETE_DATABASE_SETUP.sql` - All database tables and policies
- [x] `STORAGE_SETUP.sql` - Storage bucket policies
- [x] All RLS policies configured for public viewing where appropriate

### 2. App Code Updates ✅ (I'll do this next)
- [ ] Update `RollsContext.js` to use `public.users`
- [ ] Add profile creation on signup
- [ ] Update roll creation to reference `public.users`
- [ ] Add profile fetching functions
- [ ] Update UI to display usernames/avatars

## ⚠️ What You Need to Do (Manual - 5 minutes)

### Step 1: Run Database Setup (2 minutes)
1. Open **Supabase Dashboard** → **SQL Editor**
2. Open `COMPLETE_DATABASE_SETUP.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click **"Run"**
6. ✅ Should see "Success" message

### Step 2: Create Storage Bucket (1 minute)
1. In Supabase Dashboard, go to **Storage**
2. Click **"New bucket"**
3. Name: `roll-images`
4. Toggle **"Public bucket"** to **ON** (important!)
5. Click **"Create bucket"**

### Step 3: Run Storage Policies (1 minute)
1. Go back to **SQL Editor**
2. Open `STORAGE_SETUP.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click **"Run"**

### Step 4: Verify (1 minute)
Run this in SQL Editor to verify:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'rolls', 'roll_contributors', 'roll_images')
ORDER BY table_name;

-- Check your profile exists
SELECT id, username, display_name FROM public.users;
```

## 📊 Public Data Configuration

### What's Public (Anyone can view):
- ✅ User profiles (username, display_name, avatar_url)
- ✅ Roll titles and descriptions
- ✅ Images after `release_date` has passed
- ✅ Images if no `release_date` is set

### What's Private (Only accessible to authorized users):
- 🔒 User emails (in auth.users)
- 🔒 Roll creator info (until release_date)
- 🔒 Images before `release_date` (only contributors can see)
- 🔒 Who contributed what (until release_date)

## 🚀 After You Complete Manual Steps

Once you've run the SQL scripts and created the storage bucket, I'll:
1. Update all app code to use `public.users`
2. Add profile creation on signup
3. Update queries to fetch and display user info
4. Add UI for editing profiles

## ⏱️ Time Estimate

**Your part:** ~5 minutes (3 manual steps)
**My part:** ~10 minutes (code updates)

Let me know when you've completed the manual steps, and I'll implement all the app code changes!

