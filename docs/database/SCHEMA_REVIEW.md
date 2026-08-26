# Schema Review & Supabase Compatibility

## Issues Found & Corrections Needed

### 1. ✅ Foreign Key References - CORRECT
The schema correctly uses `REFERENCES auth.users(id)`. Supabase allows foreign keys to the `auth.users` table.

### 2. ⚠️ RollsContext Fetch Query - NEEDS FIX
The current fetch query in `RollsContext.js` uses a complex join that won't work correctly. Supabase doesn't support `.or()` with nested joins like that.

**Current (PROBLEMATIC):**
```javascript
const { data, error } = await supabase
  .from('rolls')
  .select(`
    *,
    roll_contributors!inner(user_id)
  `)
  .or(`owner_id.eq.${user.id},roll_contributors.user_id.eq.${user.id}`)
```

**Should be:** Fetch owned rolls and contributed rolls separately, then merge.

### 3. ⚠️ Storage Policies - NEEDS CORRECTION
The storage policy uses `storage.foldername(name)` which doesn't exist in Supabase. The path structure is different.

**Storage path format:** `{roll_id}/{filename}`
**To extract roll_id:** Use string functions or store path prefix

### 4. ✅ RLS Policies Syntax - CORRECT
All RLS policies use correct `auth.uid()` syntax and proper structure.

### 5. ⚠️ roll_images.contributor_id ON DELETE SET NULL - CONFLICT
The table has `contributor_id NOT NULL` but `ON DELETE SET NULL` - these conflict. Should be either:
- `NOT NULL` with `ON DELETE RESTRICT` (don't allow deleting users with images)
- Or remove `NOT NULL` to allow `SET NULL`

## Recommended Fixes

### Fix 1: Correct RollsContext fetchRolls()

```javascript
const fetchRolls = useCallback(async () => {
  if (!user) {
    setRolls([]);
    setLoading(false);
    return;
  }

  try {
    setLoading(true);
    setError(null);

    // Fetch rolls where user is owner
    const { data: ownedRolls, error: ownedError } = await supabase
      .from('rolls')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (ownedError) throw ownedError;

    // Fetch rolls where user is contributor
    const { data: contributorRolls, error: contribError } = await supabase
      .from('roll_contributors')
      .select(`
        roll_id,
        rolls (*)
      `)
      .eq('user_id', user.id);

    if (contribError) throw contribError;

    // Extract roll objects from contributorRolls
    const contributedRolls = contributorRolls
      ?.map(item => item.rolls)
      .filter(Boolean) || [];

    // Merge and deduplicate
    const allRolls = [...(ownedRolls || []), ...contributedRolls];
    const uniqueRolls = Array.from(
      new Map(allRolls.map(roll => [roll.id, roll])).values()
    );

    setRolls(uniqueRolls);
  } catch (err) {
    console.error('Error fetching rolls:', err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, [user]);
```

### Fix 2: Correct Storage Policies

Storage policies should use string functions to extract roll_id from path:

```sql
-- Users can upload images to Rolls they contribute to
CREATE POLICY "Contributors can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'roll-images' AND
    (string_to_array(name, '/'))[1] IN (
      SELECT id::text FROM rolls WHERE owner_id = auth.uid()
      UNION
      SELECT roll_id::text FROM roll_contributors WHERE user_id = auth.uid()
    )
  );

-- Users can view images in accessible Rolls
CREATE POLICY "Users can view images in accessible Rolls"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'roll-images' AND
    (string_to_array(name, '/'))[1] IN (
      SELECT id::text FROM rolls WHERE owner_id = auth.uid()
      UNION
      SELECT roll_id::text FROM roll_contributors WHERE user_id = auth.uid()
    )
  );
```

### Fix 3: Correct roll_images table

```sql
CREATE TABLE roll_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_id UUID NOT NULL REFERENCES rolls(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL, -- Supabase Storage path or URL
  contributor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Remove NOT NULL
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Fix 4: Storage Service Upload Path

The storage service uploads to path format: `{roll_id}/{filename}` which is correct for the policies above.

## Summary

**✅ Correct:**
- Table structure and relationships
- Foreign key references to auth.users
- RLS policy syntax and logic
- Indexes
- Triggers

**⚠️ Needs Fix:**
1. RollsContext fetchRolls() query (complex join issue)
2. Storage policies (use string_to_array instead of storage.foldername)
3. roll_images.contributor_id constraint (NOT NULL conflicts with ON DELETE SET NULL)

## Next Steps

1. Update RollsContext.js fetchRolls() method
2. Update DATABASE_SCHEMA.md with corrected storage policies
3. Update roll_images table definition
4. Test the queries after setting up tables in Supabase

