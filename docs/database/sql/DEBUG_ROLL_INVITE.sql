-- ============================================
-- DEBUG ROLL INVITE ISSUE
-- ============================================
-- Run these queries in Supabase SQL Editor to debug why the invitee can't see the roll
-- ============================================

-- Step 1: Find the invitee's user ID
-- Replace the ILIKE patterns with the invitee's username or email
SELECT id, email, username
FROM public.users
WHERE username ILIKE '%invitee_username%' OR email ILIKE '%invitee@example.com%';

-- Step 2: Find the inviter's user ID (to find the roll)
SELECT id, email, username
FROM public.users
WHERE username ILIKE '%inviter_username%' OR email ILIKE '%inviter@example.com%';

-- Step 3: Find the roll by title
SELECT id, title, creator_id, status
FROM rolls
WHERE title ILIKE '%roll title%'
ORDER BY created_at DESC;

-- Step 4: Check if the invitee is in roll_contributors for that roll
-- IMPORTANT: You need to run Steps 1-3 first to get the IDs!
-- Then replace 'paste-ladder-user-id-here' and 'paste-roll-id-here' with actual UUIDs
-- UUIDs look like: '123e4567-e89b-12d3-a456-426614174000'
--
-- First, let's check ALL of the invitee's contributor records (easier):
SELECT 
  rc.*,
  r.title as roll_title,
  u.username as user_username,
  u.email as user_email
FROM roll_contributors rc
JOIN rolls r ON r.id = rc.roll_id
JOIN public.users u ON u.id = rc.user_id
WHERE u.username ILIKE '%ladder%' OR u.email ILIKE '%ladder%';

-- Step 5: Check ALL roll_contributors for the "the inviter Test" roll
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

-- Step 6: Check if there's a pending invite for the invitee
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

-- Step 7: Check ALL invites for the "the inviter Test" roll
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

-- Step 9: Test if the invitee can see their own contributor record (simulate RLS)
-- Replace 'LADDER_USER_ID' with the ID from Step 1
-- This simulates what the app query would return
SELECT 
  rc.roll_id,
  r.*
FROM roll_contributors rc
JOIN rolls r ON r.id = rc.roll_id
WHERE rc.user_id = 'LADDER_USER_ID';  -- Replace with actual user ID

-- Step 10: MANUALLY ACCEPT THE INVITE (if it's still pending)
-- Based on your data, the invite ID is: YOUR_INVITE_ID
-- the invitee's user ID: YOUR_INVITEE_USER_ID
-- Roll ID: YOUR_ROLL_ID
-- the inviter's user ID: YOUR_INVITER_USER_ID

-- Option A: Use the accept function (recommended)
SELECT accept_roll_invite(
  'YOUR_INVITE_ID'::uuid,  -- invite ID
  'YOUR_INVITEE_USER_ID'::uuid   -- the invitee's user ID
);

-- Option B: Manually add to roll_contributors and update invite (if function doesn't work)
-- First, add the invitee as contributor:
INSERT INTO roll_contributors (roll_id, user_id, role, invited_by)
VALUES (
  'YOUR_ROLL_ID'::uuid,  -- Roll ID
  'YOUR_INVITEE_USER_ID'::uuid,  -- the invitee's user ID
  'contributor',
  'YOUR_INVITER_USER_ID'::uuid   -- the inviter's user ID
)
ON CONFLICT (roll_id, user_id) DO UPDATE
SET role = 'contributor',
    invited_by = EXCLUDED.invited_by;

-- Then, mark the invite as accepted:
UPDATE roll_invites
SET status = 'accepted',
    accepted_at = NOW(),
    invitee_user_id = 'YOUR_INVITEE_USER_ID'::uuid
WHERE id = 'YOUR_INVITE_ID'::uuid;
