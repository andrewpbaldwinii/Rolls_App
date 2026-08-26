# Fix Policy - Remove Extra Casts

Your policy has extra `::text` casts that might be causing issues. Try this simplified version:

## Simplified Policy Expression

Go to your policy editor and replace the WITH CHECK expression with this (simpler version):

```sql
bucket_id = 'roll-images' AND (string_to_array(name, '/'))[1] = 'profiles' AND (string_to_array(name, '/'))[2] = auth.uid()::text
```

**Key differences:**
- Removed `'roll-images'::text` → just `'roll-images'`
- Removed `'profiles'::text` → just `'profiles'`
- Removed `'/'::text` → just `'/'`
- Kept `auth.uid()::text` (this one is needed)

## Test First

Before updating the policy, run `TEST_AUTH_UID.sql` in Supabase SQL Editor to verify:
1. What `auth.uid()` returns
2. If it matches your user ID (`YOUR_USER_UUID`)
3. If the path segments match correctly

## If That Doesn't Work

Try this even simpler version (explicit casting only where needed):

```sql
bucket_id = 'roll-images' AND (string_to_array(name, '/'))[1]::text = 'profiles' AND (string_to_array(name, '/'))[2]::text = auth.uid()::text
```

Or try without any explicit text casting:

```sql
bucket_id = 'roll-images' AND (string_to_array(name, '/'))[1] = 'profiles' AND (string_to_array(name, '/'))[2] = auth.uid()::text
```

## Most Important Test

Run `TEST_AUTH_UID.sql` first - this will tell us if `auth.uid()` is returning the correct value and if the comparison is working.

