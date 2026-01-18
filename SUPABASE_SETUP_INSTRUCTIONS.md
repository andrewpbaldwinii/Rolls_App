# Supabase Setup Instructions - Likes & Comments

## Step-by-Step Guide

### 1. Open Supabase Dashboard

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project (the one for Rolls App)

### 2. Navigate to SQL Editor

1. In the left sidebar, click **"SQL Editor"**
2. Click **"New query"** button (top right)

### 3. Copy and Run the SQL Script

1. Open the file `CREATE_LIKES_COMMENTS_TABLES.sql` in your project
2. **Copy the entire contents** of the file (Ctrl+A, Ctrl+C / Cmd+A, Cmd+C)
3. **Paste it into the SQL Editor** in Supabase
4. Click the **"Run"** button (or press Ctrl+Enter / Cmd+Enter)

### 4. Verify Tables Were Created

After running the script, you should see:
- ✅ Success message in the results panel
- The script creates:
  - `photo_likes` table
  - `photo_comments` table
  - RLS (Row Level Security) policies
  - Indexes for performance

### 5. Verify in Table Editor (Optional)

1. Go to **"Table Editor"** in the left sidebar
2. You should see two new tables:
   - `photo_likes`
   - `photo_comments`

### 6. Reload Your App

After running the SQL script:
1. The app should automatically detect the new tables
2. If not, reload the app (shake device → Reload, or press `r` in Metro terminal)
3. The warning messages should disappear
4. Like/Comment buttons should now work!

## What the Script Does

The SQL script creates:

1. **`photo_likes` table**:
   - Stores which users liked which photos
   - Prevents duplicate likes (one like per user per photo)
   - Links to `auth.users` for user authentication

2. **`photo_comments` table**:
   - Stores comments on photos
   - Includes comment text, timestamps
   - Links to `auth.users` for comment authors

3. **RLS Policies**:
   - Anyone can view likes/comments (public read)
   - Only authenticated users can create likes/comments
   - Users can only delete their own likes/comments

4. **Indexes**:
   - Optimizes queries for fast lookups
   - Improves performance when loading likes/comments

## Troubleshooting

### If you get an error:

1. **"relation already exists"**: Tables already created - that's OK, you can skip
2. **"permission denied"**: Make sure you're logged into Supabase with admin access
3. **"syntax error"**: Make sure you copied the entire file, including all semicolons

### If tables don't appear:

1. Refresh the Supabase dashboard
2. Check the SQL Editor results for any error messages
3. Try running the script again (it uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times)

## After Setup

Once the tables are created:
- ✅ Like buttons will work
- ✅ Comment buttons will work
- ✅ Photo viewer will show likes/comments
- ✅ Users can like and comment on photos
- ✅ Users can like/comment on their own photos

The app will automatically start using these tables - no code changes needed!
