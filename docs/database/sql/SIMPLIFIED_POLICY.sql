-- Simplified policy expression (remove extra ::text casts)
-- Try this in the Dashboard policy editor

bucket_id = 'roll-images' AND (string_to_array(name, '/'))[1] = 'profiles' AND (string_to_array(name, '/'))[2] = auth.uid()::text

