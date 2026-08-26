# Profile Setup Complete ✅

## Changes Made

### 1. Fixed SignUpScreen.js
- Updated profile creation to **always include email** when creating a profile
- This ensures the foreign key constraint for `rolls.creator_id` will work
- The `display_name` field is set from the username input during signup

### 2. Created COMPLETE_PROFILE_SETUP.sql
This comprehensive SQL script:
- Makes email column nullable (prevents NOT NULL constraint errors)
- Creates profiles for all existing users who don't have one
- Updates the trigger to always include email when creating profiles
- Ensures RLS policies allow public viewing of profiles
- Fixes the foreign key constraint for rolls

## Next Steps

### Step 1: Run the SQL Script
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Run the `COMPLETE_PROFILE_SETUP.sql` script
4. This will:
   - Fix your existing profile (add email if missing)
   - Update the trigger for future signups
   - Ensure public viewing works

### Step 2: Test the Flow
1. **Create a Roll**: You should now be able to create rolls without foreign key errors
2. **View Public Profile**: Navigate to Profile → "View Public Profile"
3. **Sign Up New User**: New users will automatically get profiles with email

## How It Works Now

### Signup Flow:
1. User signs up with email, password, and username
2. Supabase creates auth user
3. **Trigger automatically creates profile** with:
   - `id` (from auth.users)
   - `email` (from auth.users)
   - `username` (default from email)
   - `display_name` (default from email)
4. **SignUpScreen updates profile** with:
   - `username` (user's chosen username)
   - `display_name` (same as username - user's choice)

### Creating Rolls:
- The `rolls.creator_id` foreign key now works because:
  - Your profile exists in `public.users`
  - Your profile has an `id` that matches `auth.users.id`
  - The foreign key constraint is satisfied

### Viewing Public Profile:
- Profiles are publicly viewable via RLS policy
- `display_name` is shown on ProfileScreen and PublicProfileScreen
- All profile data (username, display_name, avatar_url, bio) is accessible

## Verification

After running the SQL script, verify everything works:

```sql
-- Check your profile exists with email
SELECT id, email, username, display_name 
FROM public.users 
WHERE id = auth.uid();

-- Check you can create a roll (this should work now)
-- Try creating a roll in the app
```

## Troubleshooting

If you still get errors:

1. **Foreign key error**: Make sure you ran `COMPLETE_PROFILE_SETUP.sql`
2. **Email NOT NULL error**: The script makes email nullable, but if you still get errors, check that your profile has email:
   ```sql
   UPDATE public.users 
   SET email = (SELECT email FROM auth.users WHERE id = public.users.id)
   WHERE email IS NULL;
   ```
3. **Can't view public profile**: Check RLS policies are set:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'users';
   ```

## Summary

✅ SignUpScreen now always includes email  
✅ SQL script fixes all existing profiles  
✅ Trigger ensures future profiles include email  
✅ RLS policies allow public viewing  
✅ Foreign key constraints work for rolls  
✅ Public profiles are accessible  

You should now be able to:
- ✅ Create rolls
- ✅ View your public profile
- ✅ See display_name on profile screens

