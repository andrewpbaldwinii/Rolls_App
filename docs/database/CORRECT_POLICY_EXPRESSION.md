# Correct Policy Expression for Dashboard

## ❌ DON'T paste this (what you have):
```sql
BEGIN;
  ALTER POLICY "Authenticated users can upload images" ON "storage"."objects" WITH CHECK (bucket_id = 'roll-images' AND ( -- Allow roll uploads (existing) (string_to_array(name, '/'))[1] IN ( SELECT id::text FROM rolls WHERE creator_id = auth.uid() UNION SELECT roll_id::text FROM roll_contributors WHERE user_id = auth.uid() ) OR -- Allow profile uploads (new) ( (string_to_array(name, '/'))[1] = 'profiles' AND (string_to_array(name, '/'))[2] = auth.uid()::text ) ));
COMMIT;
```

## ✅ DO paste this (just the expression):
```sql
bucket_id = 'roll-images' AND
(
  -- Allow roll uploads (existing)
  (string_to_array(name, '/'))[1] IN (
    SELECT id::text FROM rolls WHERE creator_id = auth.uid()
    UNION
    SELECT roll_id::text FROM roll_contributors WHERE user_id = auth.uid()
  )
  OR
  -- Allow profile uploads (new)
  (
    (string_to_array(name, '/'))[1] = 'profiles' AND
    (string_to_array(name, '/'))[2] = auth.uid()::text
  )
)
```

## Steps:

1. Go to **Supabase Dashboard** → **Storage** → **roll-images** → **Policies**
2. Click **Edit** on "Authenticated users can upload images"
3. In the **"WITH CHECK expression"** field, **delete everything**
4. **Paste ONLY the expression above** (the ✅ version)
5. Click **Save**

The Dashboard will automatically wrap it in the ALTER POLICY statement - you don't need to include BEGIN/COMMIT or ALTER POLICY yourself.

