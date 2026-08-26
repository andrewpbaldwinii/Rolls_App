# Rolls App Database Schema

## Core Domain: Rolls

Rolls are the core domain object - a shared camera-roll-style album containing images, contributors, permissions, and lifecycle state.

## Database Tables

### 1. `rolls` Table

Stores Roll metadata and lifecycle state.

```sql
CREATE TABLE rolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('unavailable', 'active', 'developing', 'developed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rolls_owner_id ON rolls(owner_id);
CREATE INDEX idx_rolls_status ON rolls(status);
CREATE INDEX idx_rolls_created_at ON rolls(created_at DESC);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rolls_updated_at BEFORE UPDATE ON rolls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. `roll_contributors` Table

Stores contributors (members) of each Roll and their permissions.

```sql
CREATE TABLE roll_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_id UUID NOT NULL REFERENCES rolls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'contributor' CHECK (role IN ('owner', 'contributor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(roll_id, user_id)
);

-- Indexes
CREATE INDEX idx_roll_contributors_roll_id ON roll_contributors(roll_id);
CREATE INDEX idx_roll_contributors_user_id ON roll_contributors(user_id);
```

### 3. `roll_images` Table

Stores images belonging to Rolls. Every image belongs to exactly one Roll.

```sql
CREATE TABLE roll_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_id UUID NOT NULL REFERENCES rolls(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL, -- Supabase Storage path or URL
  contributor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_roll_images_roll_id ON roll_images(roll_id);
CREATE INDEX idx_roll_images_contributor_id ON roll_images(contributor_id);
CREATE INDEX idx_roll_images_created_at ON roll_images(created_at DESC);
```

## Row Level Security (RLS) Policies

### Rolls Table Policies

```sql
ALTER TABLE rolls ENABLE ROW LEVEL SECURITY;

-- Users can view Rolls they own or are contributors to
CREATE POLICY "Users can view Rolls they own or contribute to"
  ON rolls FOR SELECT
  USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT roll_id FROM roll_contributors WHERE user_id = auth.uid()
    )
  );

-- Users can create Rolls
CREATE POLICY "Users can create Rolls"
  ON rolls FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Only owners can update Rolls
CREATE POLICY "Owners can update Rolls"
  ON rolls FOR UPDATE
  USING (owner_id = auth.uid());

-- Only owners can delete Rolls
CREATE POLICY "Owners can delete Rolls"
  ON rolls FOR DELETE
  USING (owner_id = auth.uid());
```

### Roll Contributors Table Policies

```sql
ALTER TABLE roll_contributors ENABLE ROW LEVEL SECURITY;

-- Users can view contributors of Rolls they have access to
CREATE POLICY "Users can view contributors of accessible Rolls"
  ON roll_contributors FOR SELECT
  USING (
    roll_id IN (
      SELECT id FROM rolls WHERE owner_id = auth.uid()
      UNION
      SELECT roll_id FROM roll_contributors WHERE user_id = auth.uid()
    )
  );

-- Owners can add contributors
CREATE POLICY "Owners can add contributors"
  ON roll_contributors FOR INSERT
  WITH CHECK (
    roll_id IN (SELECT id FROM rolls WHERE owner_id = auth.uid())
  );

-- Owners can update contributors
CREATE POLICY "Owners can update contributors"
  ON roll_contributors FOR UPDATE
  USING (
    roll_id IN (SELECT id FROM rolls WHERE owner_id = auth.uid())
  );

-- Owners can remove contributors (or users can remove themselves)
CREATE POLICY "Owners or users can remove contributors"
  ON roll_contributors FOR DELETE
  USING (
    roll_id IN (SELECT id FROM rolls WHERE owner_id = auth.uid()) OR
    user_id = auth.uid()
  );
```

### Roll Images Table Policies

```sql
ALTER TABLE roll_images ENABLE ROW LEVEL SECURITY;

-- Users can view images in Rolls they have access to
CREATE POLICY "Users can view images in accessible Rolls"
  ON roll_images FOR SELECT
  USING (
    roll_id IN (
      SELECT id FROM rolls WHERE owner_id = auth.uid()
      UNION
      SELECT roll_id FROM roll_contributors WHERE user_id = auth.uid()
    )
  );

-- Contributors can add images
CREATE POLICY "Contributors can add images"
  ON roll_images FOR INSERT
  WITH CHECK (
    contributor_id = auth.uid() AND
    roll_id IN (
      SELECT id FROM rolls WHERE owner_id = auth.uid()
      UNION
      SELECT roll_id FROM roll_contributors WHERE user_id = auth.uid()
    )
  );

-- Contributors can update their own images
CREATE POLICY "Contributors can update their images"
  ON roll_images FOR UPDATE
  USING (contributor_id = auth.uid());

-- Contributors can delete their own images (owners can delete any)
CREATE POLICY "Contributors or owners can delete images"
  ON roll_images FOR DELETE
  USING (
    contributor_id = auth.uid() OR
    roll_id IN (SELECT id FROM rolls WHERE owner_id = auth.uid())
  );
```

## Storage Bucket for Images

Create a Supabase Storage bucket for roll images:

```sql
-- In Supabase Dashboard > Storage, create bucket:
-- Name: roll-images
-- Public: false (use RLS)
-- File size limit: 10MB
-- Allowed MIME types: image/jpeg, image/png, image/heic, image/webp
```

Storage Policies:

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

-- Users can delete their own images or owners can delete any
CREATE POLICY "Users can delete images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'roll-images' AND
    (string_to_array(name, '/'))[1] IN (
      SELECT id::text FROM rolls WHERE owner_id = auth.uid()
    )
  );
```

**Note:** The storage path format is `{roll_id}/{filename}`. The policy uses `string_to_array(name, '/')[1]` to extract the roll_id from the path.

