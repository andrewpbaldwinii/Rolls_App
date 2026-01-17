-- ============================================
-- Rolls: Public/Private + Title Image Migration
-- ============================================
-- Run this in Supabase SQL Editor.
-- This adds:
-- 1) rolls.is_public (if missing)
-- 2) rolls.title_image_url (if missing)
--
-- If you already ran PUBLIC_PROFILE_SETUP.sql, (1) may already exist.
-- ============================================

ALTER TABLE public.rolls
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

ALTER TABLE public.rolls
ADD COLUMN IF NOT EXISTS title_image_url TEXT;

-- Helpful index for public profile roll queries
CREATE INDEX IF NOT EXISTS idx_rolls_creator_public_created
ON public.rolls (creator_id, created_at DESC)
WHERE is_public = TRUE;


