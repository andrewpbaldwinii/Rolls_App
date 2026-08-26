-- Create function to count photos for user stats
-- This function bypasses RLS to count ALL photos a user has taken
-- Used for displaying accurate "Photos Taken" stats on public profiles

CREATE OR REPLACE FUNCTION count_user_photos(p_user_id UUID)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roll_photos_count INTEGER := 0;
  v_profile_photos_count INTEGER := 0;
BEGIN
  -- Count photos from roll_images (excluding title images)
  SELECT COUNT(*) INTO v_roll_photos_count
  FROM roll_images
  WHERE contributor_id = p_user_id
    AND (caption IS NULL OR caption != '__title_image__');
  
  -- Count standalone profile photos (if table exists)
  BEGIN
    SELECT COUNT(*) INTO v_profile_photos_count
    FROM public_profile_photos
    WHERE user_id = p_user_id;
  EXCEPTION
    WHEN undefined_table THEN
      v_profile_photos_count := 0;
  END;
  
  RETURN v_roll_photos_count + v_profile_photos_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION count_user_photos(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION count_user_photos(UUID) TO anon;
