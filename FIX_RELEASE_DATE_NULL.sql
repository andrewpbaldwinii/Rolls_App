-- ============================================
-- FIX RELEASE_DATE NOT NULL CONSTRAINT
-- ============================================
-- This script fixes the release_date column to allow NULL values
-- Run this in Supabase SQL Editor if you're getting errors about
-- release_date violating not-null constraint
-- ============================================

-- Make release_date nullable (optional)
ALTER TABLE rolls 
ALTER COLUMN release_date DROP NOT NULL;

-- Verify the change
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'rolls'
  AND table_schema = 'public'
  AND column_name = 'release_date';
