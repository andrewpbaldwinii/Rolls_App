# Supabase Database Checklist

This document helps you check what's already in your Supabase database and what needs to be added.

## How to Check What Exists

Run these SQL queries in your Supabase SQL Editor to see what tables/policies you have:

### 1. Check Existing Tables

```sql
-- See all tables in your database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### 2. Check Existing Policies (RLS)

```sql
-- See all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 3. Check Storage Buckets

```sql
-- See all storage buckets
SELECT name, id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
ORDER BY name;
```

### 4. Check Storage Policies

```sql
-- See all storage policies
SELECT name, bucket_id, definition
FROM storage.policies
ORDER BY bucket_id, name;
```

---

## Required Tables Checklist

### ✅ `rolls` Table

**Required columns:**
- `id` (UUID, PRIMARY KEY, DEFAULT gen_random_uuid())
- `name` (TEXT, NOT NULL)
- `description` (TEXT, nullable)
- `owner_id` (UUID, NOT NULL, REFERENCES auth.users(id))
- `status` (TEXT, NOT NULL, DEFAULT 'active', CHECK constraint)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**Check if exists:**
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'rolls'
ORDER BY ordinal_position;
```

**If missing, create it:**
See `DATABASE_SCHEMA.md` section "1. `rolls` Table"

---

### ✅ `roll_contributors` Table

**Required columns:**
- `id` (UUID, PRIMARY KEY, DEFAULT gen_random_uuid())
- `roll_id` (UUID, NOT NULL, REFERENCES rolls(id))
- `user_id` (UUID, NOT NULL, REFERENCES auth.users(id))
- `role` (TEXT, NOT NULL, DEFAULT 'contributor', CHECK constraint)
- `invited_by` (UUID, nullable, REFERENCES auth.users(id))
- `joined_at` (TIMESTAMPTZ, DEFAULT NOW())
- UNIQUE constraint on (roll_id, user_id)

**Check if exists:**
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'roll_contributors'
ORDER BY ordinal_position;
```

**If missing, create it:**
See `DATABASE_SCHEMA.md` section "2. `roll_contributors` Table"

---

### ✅ `roll_images` Table

**Required columns:**
- `id` (UUID, PRIMARY KEY, DEFAULT gen_random_uuid())
- `roll_id` (UUID, NOT NULL, REFERENCES rolls(id))
- `image_url` (TEXT, NOT NULL)
- `contributor_id` (UUID, nullable, REFERENCES auth.users(id))
- `caption` (TEXT, nullable)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Check if exists:**
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'roll_images'
ORDER BY ordinal_position;
```

**If missing, create it:**
See `DATABASE_SCHEMA.md` section "3. `roll_images` Table"

---

## Required Indexes Checklist

### For `rolls` table:
- ✅ `idx_rolls_owner_id` on `owner_id`
- ✅ `idx_rolls_status` on `status`
- ✅ `idx_rolls_created_at` on `created_at DESC`

**Check indexes:**
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'rolls';
```

### For `roll_contributors` table:
- ✅ `idx_roll_contributors_roll_id` on `roll_id`
- ✅ `idx_roll_contributors_user_id` on `user_id`

**Check indexes:**
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'roll_contributors';
```

### For `roll_images` table:
- ✅ `idx_roll_images_roll_id` on `roll_id`
- ✅ `idx_roll_images_contributor_id` on `contributor_id`
- ✅ `idx_roll_images_created_at` on `created_at DESC`

**Check indexes:**
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'roll_images';
```

---

## Required RLS Policies Checklist

### For `rolls` table:
- ✅ `Users can view Rolls they own or contribute to` (SELECT)
- ✅ `Users can create Rolls` (INSERT)
- ✅ `Owners can update Rolls` (UPDATE)
- ✅ `Owners can delete Rolls` (DELETE)

**Check policies:**
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'rolls';
```

### For `roll_contributors` table:
- ✅ `Users can view contributors of accessible Rolls` (SELECT)
- ✅ `Owners can add contributors` (INSERT)
- ✅ `Owners can update contributors` (UPDATE)
- ✅ `Owners or users can remove contributors` (DELETE)

**Check policies:**
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'roll_contributors';
```

### For `roll_images` table:
- ✅ `Users can view images in accessible Rolls` (SELECT)
- ✅ `Contributors can add images` (INSERT)
- ✅ `Contributors can update their images` (UPDATE)
- ✅ `Contributors or owners can delete images` (DELETE)

**Check policies:**
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'roll_images';
```

---

## Required Storage Bucket Checklist

### ✅ `roll-images` bucket

**Required settings:**
- Name: `roll-images`
- Public: `false` (private, uses RLS)
- File size limit: Recommended 10MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/heic`, `image/webp`

**Check if exists:**
```sql
SELECT name, id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name = 'roll-images';
```

**If missing:**
1. Go to Supabase Dashboard > Storage
2. Click "New bucket"
3. Name: `roll-images`
4. Make it private (uncheck "Public bucket")
5. Set file size limit and MIME types

---

## Required Storage Policies Checklist

### For `roll-images` bucket:
- ✅ `Contributors can upload images` (INSERT)
- ✅ `Users can view images in accessible Rolls` (SELECT)
- ✅ `Users can delete images` (DELETE)

**Check policies:**
```sql
SELECT name, bucket_id, definition
FROM storage.policies
WHERE bucket_id = 'roll-images';
```

---

## Required Functions/Triggers Checklist

### ✅ `update_updated_at_column()` function

**Check if exists:**
```sql
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'update_updated_at_column';
```

### ✅ Trigger: `update_rolls_updated_at`

**Check if exists:**
```sql
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'rolls';
```

---

## Quick Comparison Query

Run this to see what tables exist vs what's required:

```sql
-- Compare existing tables with required tables
WITH required_tables AS (
  SELECT unnest(ARRAY['rolls', 'roll_contributors', 'roll_images']) AS table_name
),
existing_tables AS (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
)
SELECT 
  r.table_name AS required_table,
  CASE WHEN e.table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status
FROM required_tables r
LEFT JOIN existing_tables e ON r.table_name = e.table_name
ORDER BY r.table_name;
```

---

## Next Steps

1. **Run the comparison queries above** to see what you have
2. **Compare with the checklist** to identify what's missing
3. **Create missing tables/policies** using SQL from `DATABASE_SCHEMA.md`
4. **Test the app** - the error should go away once all tables exist

If you share the results of the comparison query, I can help you create only what's missing!

