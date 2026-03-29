-- Optional per-contributor photo cap for a roll (owner is not limited).
-- NULL = no limit. Integer >= 1 = max photos each contributor may add to roll_images.

ALTER TABLE public.rolls
ADD COLUMN IF NOT EXISTS contributor_photo_limit INTEGER NULL
  CHECK (contributor_photo_limit IS NULL OR contributor_photo_limit >= 1);

COMMENT ON COLUMN public.rolls.contributor_photo_limit IS
  'Max photos per non-owner contributor for this roll; NULL means unlimited.';
