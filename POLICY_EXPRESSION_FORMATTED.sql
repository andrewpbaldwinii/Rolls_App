-- Try this formatted version (may work better in Dashboard):
bucket_id = 'roll-images' AND
(
  (string_to_array(name, '/'))[1] IN (
    SELECT id::text FROM rolls WHERE creator_id = auth.uid()
    UNION
    SELECT roll_id::text FROM roll_contributors WHERE user_id = auth.uid()
  )
  OR
  (
    (string_to_array(name, '/'))[1] = 'profiles' AND
    (string_to_array(name, '/'))[2] = auth.uid()::text
  )
)

