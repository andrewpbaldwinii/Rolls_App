# Signup Error Troubleshooting Guide

## Quick Fix

### Step 1: Run the Quick Fix SQL
1. Open Supabase SQL Editor
2. Run `FIX_SIGNUP_NOW.sql`
3. This will:
   - Fix the trigger to handle the "name" column properly
   - Ensure all required columns exist
   - Set up RLS policies correctly

### Step 2: Try Signing Up Again
After running the SQL, try signing up again.

## If You Still Get Errors

### Check the Error Message
The app now shows more detailed error messages. Common errors:

1. **"Username is already taken"**
   - Solution: Choose a different username

2. **"Permission denied" or "policy" error**
   - Solution: Run `FIX_SIGNUP_NOW.sql` or `COMPLETE_PROFILE_SETUP.sql`

3. **"Missing required field" or "NOT NULL constraint"**
   - Solution: Run `FIX_SIGNUP_NOW.sql` to make columns nullable

4. **"No rows" or "Profile does not exist"**
   - Solution: The trigger might not be working. Run `FIX_SIGNUP_NOW.sql`

### Diagnose the Issue
Run `DIAGNOSE_SIGNUP_ERROR.sql` in Supabase SQL Editor to check:
- If the trigger exists
- If RLS policies are set up
- If there are constraint issues
- If the "name" column is causing problems

## What Was Fixed

### 1. SignUpScreen.js
- ✅ Better error messages
- ✅ Username uniqueness check before insert
- ✅ More detailed error logging

### 2. Trigger Function
- ✅ Handles "name" column gracefully (checks if it exists)
- ✅ Always includes email
- ✅ Better conflict handling

### 3. Database Setup
- ✅ Makes email nullable (prevents NOT NULL errors)
- ✅ Ensures all columns exist
- ✅ Sets up RLS policies correctly

## Common Issues and Solutions

### Issue: "Foreign key constraint" error
**Solution:** Your profile doesn't have an email. Run:
```sql
UPDATE public.users 
SET email = (SELECT email FROM auth.users WHERE id = public.users.id)
WHERE email IS NULL;
```

### Issue: "Username already exists"
**Solution:** The app now checks this before inserting. Choose a different username.

### Issue: "Permission denied"
**Solution:** RLS policies aren't set up. Run `FIX_SIGNUP_NOW.sql`.

### Issue: Trigger not creating profile
**Solution:** 
1. Check if trigger exists: Run `DIAGNOSE_SIGNUP_ERROR.sql`
2. Recreate trigger: Run `FIX_SIGNUP_NOW.sql`

## Testing

After running `FIX_SIGNUP_NOW.sql`, test signup:
1. Try signing up with a new email
2. Check the console logs for any errors
3. If it works, try creating a roll
4. Try viewing your public profile

## Still Having Issues?

1. **Check Console Logs**: The app now logs detailed error information
2. **Run Diagnostics**: Run `DIAGNOSE_SIGNUP_ERROR.sql` to see what's wrong
3. **Check Supabase Logs**: Go to Supabase Dashboard → Logs → Postgres Logs

## Next Steps

Once signup works:
1. ✅ You can create rolls
2. ✅ You can view your public profile
3. ✅ Your display_name will be set from username
4. ✅ Profile is publicly viewable

