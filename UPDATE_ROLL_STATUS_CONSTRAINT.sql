-- ============================================
-- Update rolls table to allow 'developing' and 'developed' statuses
-- ============================================
-- Run this in Supabase SQL Editor
-- This updates the CHECK constraint to allow the new status values

-- STEP 1: First, check what status values currently exist
-- (Run this to see what needs to be fixed)
SELECT DISTINCT status, COUNT(*) as count
FROM rolls
GROUP BY status
ORDER BY status;

-- STEP 2: Update any invalid status values to 'active' as a safe default
-- This ensures all rows have valid status before we update the constraint
UPDATE rolls
SET status = 'active'
WHERE status NOT IN ('unavailable', 'active', 'developing', 'developed', 'archived');

-- STEP 3: Now drop the old constraint
ALTER TABLE rolls DROP CONSTRAINT IF EXISTS rolls_status_check;

-- STEP 4: Create new constraint with all allowed status values
ALTER TABLE rolls 
ADD CONSTRAINT rolls_status_check 
CHECK (status IN ('unavailable', 'active', 'developing', 'developed', 'archived'));

-- STEP 5: Verify the constraint was created
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'rolls'::regclass
  AND conname = 'rolls_status_check';

-- STEP 6: Verify all rows now have valid status
SELECT DISTINCT status, COUNT(*) as count
FROM rolls
GROUP BY status
ORDER BY status;
