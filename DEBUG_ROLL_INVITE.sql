-- ============================================
-- DEBUG ROLL INVITE ISSUE
-- ============================================
-- Run these queries in Supabase SQL Editor to debug why Ladder can't see the roll
-- ============================================

-- Step 1: Find Ladder's user ID
-- Replace 'ladder' with Ladder's actual username or email
SELECT id, email, username 
FROM public.users 
WHERE username ILIKE '%ladder%' OR email ILIKE '%ladder%';

-- Step 2: Find Andrew's user ID (to find the roll)
SELECT id, email, username 
FROM public.users 
WHERE username ILIKE '%andrew%' OR email ILIKE '%andrew%';

-- Step 3: Find the "Andrew Test" roll
SELECT id, title, creator_id, status
FROM rolls 
WHERE title ILIKE '%andrew test%' OR title ILIKE '%andrew%test%'
ORDER BY created_at DESC;

-- Step 4: Check if Ladder is in roll_contributors for that roll
-- IMPORTANT: You need to run Steps 1-3 first to get the IDs!
-- Then replace 'paste-ladder-user-id-here' and 'paste-roll-id-here' with actual UUIDs
-- UUIDs look like: '123e4567-e89b-12d3-a456-426614174000'
--
-- First, let's check ALL of Ladder's contributor records (easier):
SELECT 
  rc.*,
  r.title as roll_title,
  u.username as user_username,
  u.email as user_email
FROM roll_contributors rc
JOIN rolls r ON r.id = rc.roll_id
JOIN public.users u ON u.id = rc.user_id
WHERE u.username ILIKE '%ladder%' OR u.email ILIKE '%ladder%';

-- Step 5: Check ALL roll_contributors for the "Andrew Test" roll
-- This is easier - no need for roll ID, just search by roll title
SELECT 
  rc.*,
  r.title as roll_title,
  u.username,
  u.email
FROM roll_contributors rc
JOIN rolls r ON r.id = rc.roll_id
JOIN public.users u ON u.id = rc.user_id
WHERE r.title ILIKE '%andrew test%' OR r.title ILIKE '%andrew%test%'
ORDER BY rc.joined_at DESC;

-- Step 6: Check if there's a pending invite for Ladder
-- Replace 'LADDER_USER_ID' with the ID from Step 1
-- Replace 'ROLL_ID' with the ID from Step 3
SELECT 
  ri.*,
  r.title as roll_title
FROM roll_invites ri
JOIN rolls r ON r.id = ri.roll_id
WHERE ri.invitee_user_id = 'LADDER_USER_ID'  -- Replace with actual user ID
  AND ri.roll_id = 'ROLL_ID'  -- Replace with actual roll ID
  AND ri.status = 'pending';

-- Step 7: Check ALL invites for the "Andrew Test" roll
-- Replace 'ROLL_ID' with the ID from Step 3
SELECT 
  ri.*,
  inviter.username as inviter_username,
  invitee.username as invitee_username,
  invitee.email as invitee_email
FROM roll_invites ri
LEFT JOIN public.users inviter ON inviter.id = ri.inviter_id
LEFT JOIN public.users invitee ON invitee.id = ri.invitee_user_id
WHERE ri.roll_id = 'ROLL_ID'  -- Replace with actual roll ID
ORDER BY ri.created_at DESC;

-- Step 8: Check RLS policies on roll_contributors
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'roll_contributors'
ORDER BY policyname;

-- Step 9: Test if Ladder can see their own contributor record (simulate RLS)
-- Replace 'LADDER_USER_ID' with the ID from Step 1
-- This simulates what the app query would return
SELECT 
  rc.roll_id,
  r.*
FROM roll_contributors rc
JOIN rolls r ON r.id = rc.roll_id
WHERE rc.user_id = 'LADDER_USER_ID';  -- Replace with actual user ID

-- Step 10: MANUALLY ACCEPT THE INVITE (if it's still pending)
-- Based on your data, the invite ID is: 4eca1a9a-3275-4300-aab2-c372c9e7d4c6
-- Ladder's user ID: 2cff8f11-16a5-4815-a305-d2fcb69aae7d
-- Roll ID: 0f711904-d909-4b08-b36d-1ca0e17396ff
-- Andrew's user ID: 3c2519e8-acbc-48ed-b277-110ae67634f8

-- Option A: Use the accept function (recommended)
SELECT accept_roll_invite(
  '4eca1a9a-3275-4300-aab2-c372c9e7d4c6'::uuid,  -- invite ID
  '2cff8f11-16a5-4815-a305-d2fcb69aae7d'::uuid   -- Ladder's user ID
);

-- Option B: Manually add to roll_contributors and update invite (if function doesn't work)
-- First, add Ladder as contributor:
INSERT INTO roll_contributors (roll_id, user_id, role, invited_by)
VALUES (
  '0f711904-d909-4b08-b36d-1ca0e17396ff'::uuid,  -- Roll ID
  '2cff8f11-16a5-4815-a305-d2fcb69aae7d'::uuid,  -- Ladder's user ID
  'contributor',
  '3c2519e8-acbc-48ed-b277-110ae67634f8'::uuid   -- Andrew's user ID
)
ON CONFLICT (roll_id, user_id) DO UPDATE
SET role = 'contributor',
    invited_by = EXCLUDED.invited_by;

-- Then, mark the invite as accepted:
UPDATE roll_invites
SET status = 'accepted',
    accepted_at = NOW(),
    invitee_user_id = '2cff8f11-16a5-4815-a305-d2fcb69aae7d'::uuid
WHERE id = '4eca1a9a-3275-4300-aab2-c372c9e7d4c6'::uuid;
