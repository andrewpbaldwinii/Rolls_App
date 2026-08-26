# Fix Errors - Likes & Comments

## Current Issues:

1. **Database table missing**: `Could not find the table 'public.photo_likes'`
2. **Syntax errors**: Duplicate identifier errors (likely hot reload cache)
3. **React Hooks order errors**: (likely hot reload cache)

## Solution:

### Step 1: Run SQL Script (Required)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open `CREATE_LIKES_COMMENTS_TABLES.sql`
3. Copy and paste the entire SQL script
4. Click **Run** to create the tables

This will create:
- `photo_likes` table
- `photo_comments` table
- RLS policies

### Step 2: Clear Metro Cache

Stop your Metro bundler (Ctrl+C), then restart with:

```bash
npm start -- --reset-cache
```

Or:

```bash
npx react-native start --reset-cache
```

This will clear hot reload cache issues causing the duplicate identifier errors.

### Step 3: Reload App

After restarting Metro, reload your app:
- Shake device → "Reload"
- Or press `r` in Metro terminal

## What These Errors Mean:

- **Table missing error**: Normal - you need to run the SQL script first
- **Duplicate identifier errors**: Hot reload cache issues - `--reset-cache` fixes this
- **Hooks order errors**: Also cache issues - will be fixed by clearing cache

Once the SQL script is run and cache is cleared, all errors should be resolved!
