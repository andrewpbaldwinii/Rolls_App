import { supabase } from '../lib/supabase';

/**
 * Get public profile data for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Profile data with stats
 */
export const getPublicProfile = async (userId) => {
  try {
    // Get user profile - try with email first, fallback without if column doesn't exist
    let profileQuery = supabase
      .from('users')
      .select('id, username, display_name, avatar_url, bio')
      .eq('id', userId)
      .single();

    const { data: profile, error: profileError } = await profileQuery;

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw profileError;
    }

    if (!profile) {
      throw new Error('Profile not found');
    }

    // Try to get email separately (in case column doesn't exist)
    let email = null;
    try {
      const { data: emailData, error: emailError } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (!emailError && emailData) {
        email = emailData.email;
      }
    } catch (e) {
      console.log('Email column may not exist, skipping:', e.message);
    }

    // Calculate stats directly from database queries
    let stats = { rolls_created: 0, photos_taken: 0, followers_count: 0 };
    
    try {
      // Try RPC function first (if it exists)
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_user_public_stats', { user_uuid: userId });

      if (!statsError && statsData && statsData[0]) {
        stats = statsData[0];
      } else {
        // Fallback: Calculate stats directly from database
        console.log('Stats function not available, calculating directly from database...');
        
        // Count rolls created by this user
        const { count: rollsCount, error: rollsError } = await supabase
          .from('rolls')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', userId);
        
        if (!rollsError && rollsCount !== null) {
          stats.rolls_created = rollsCount;
        }

        // Count photos taken by this user (all photos, not just public)
        // Exclude title images - they're separate and stored in rolls.title_image_url
        const { count: photosCount, error: photosError } = await supabase
          .from('roll_images')
          .select('*', { count: 'exact', head: true })
          .eq('contributor_id', userId)
          .neq('caption', '__title_image__');
        
        if (!photosError && photosCount !== null) {
          stats.photos_taken = photosCount;
        }

        // Count followers (if follows table exists)
        try {
          const { count: followersCount, error: followersError } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', userId);
          
          if (!followersError && followersCount !== null) {
            stats.followers_count = followersCount;
          }
        } catch (followError) {
          console.log('Follows table may not exist, skipping followers count:', followError.message);
        }
      }
    } catch (e) {
      console.log('Error fetching stats, using defaults:', e.message);
      // Try direct calculation as fallback
      try {
        const { count: rollsCount } = await supabase
          .from('rolls')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', userId);
        if (rollsCount !== null) stats.rolls_created = rollsCount;

        // Exclude title images - they're separate and stored in rolls.title_image_url
        const { count: photosCount } = await supabase
          .from('roll_images')
          .select('*', { count: 'exact', head: true })
          .eq('contributor_id', userId)
          .neq('caption', '__title_image__');
        if (photosCount !== null) stats.photos_taken = photosCount;
      } catch (fallbackError) {
        console.log('Fallback stats calculation failed:', fallbackError.message);
      }
    }

    return {
      ...profile,
      email,
      stats,
    };
  } catch (error) {
    console.error('Error fetching public profile:', error);
    throw error;
  }
};

/**
 * Get public rolls for a user
 * 
 * Note: Public rolls appear on the profile immediately when toggled as public.
 * The release_date only controls whether photos inside the roll are locked,
 * not whether the roll itself appears on the public profile.
 * 
 * Excludes "Profile Photos" rolls - these are system rolls that shouldn't appear in the Rolls tab.
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of public rolls (excluding Profile Photos)
 */
export const getPublicRolls = async (userId) => {
  try {
    // Get all public rolls (regardless of release_date)
    // release_date only affects photo visibility, not roll visibility on profile
    // Exclude "Profile Photos" rolls - these are system rolls for standalone photos
    const { data, error } = await supabase
      .from('rolls')
      .select('id, title, description, created_at, is_public, title_image_url, release_date')
      .eq('creator_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Filter out "Profile Photos" rolls (case-insensitive)
    const filteredRolls = (data || []).filter(
      roll => roll.title?.toLowerCase() !== 'profile photos'
    );
    
    return filteredRolls;
  } catch (error) {
    console.error('Error fetching public rolls:', error);
    throw error;
  }
};

/**
 * Get public photos for a user
 * Includes both:
 * 1. Standalone public profile photos (from public_profile_photos table)
 * 2. Photos from public rolls where the roll's release_date has passed
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of public photos
 */
export const getPublicPhotos = async (userId) => {
  try {
    const now = new Date().toISOString();
    
    // Get standalone public profile photos (not attached to any roll)
    // Handle gracefully if table doesn't exist yet
    let profilePhotos = [];
    let profilePhotosError = null;
    try {
      const { data, error } = await supabase
        .from('public_profile_photos')
        .select('id, image_url, caption, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      profilePhotos = data || [];
      profilePhotosError = error;
    } catch (err) {
      // Table doesn't exist yet - this is OK, user needs to run the migration
      if (err.code === 'PGRST205' || err.message?.includes('not found')) {
        console.log('public_profile_photos table not found - run CREATE_PUBLIC_PROFILE_PHOTOS_TABLE.sql');
        profilePhotos = [];
        profilePhotosError = null; // Don't treat this as an error
      } else {
        profilePhotosError = err;
      }
    }

    // Get photos from public rolls where release_date has passed (or is null)
    // Exclude title images - they're separate and stored in rolls.title_image_url
    // Photos are public if the roll is public AND the release_date has passed
    const { data: rollPhotos, error: rollPhotosError } = await supabase
      .from('roll_images')
      .select('id, image_url, caption, created_at, roll_id, rolls(title, is_public, release_date)')
      .eq('contributor_id', userId)
      .neq('caption', '__title_image__')
      .order('created_at', { ascending: false });

    // Handle errors gracefully
    if (profilePhotosError) {
      console.warn('Error fetching public profile photos:', profilePhotosError);
    }
    
    if (rollPhotosError) {
      // If the join fails, try a simpler query
      console.warn('Error fetching public photos with roll join:', rollPhotosError);
      const { data: simpleData, error: simpleError } = await supabase
        .from('roll_images')
        .select('id, image_url, caption, created_at, roll_id')
        .eq('contributor_id', userId)
        .neq('caption', '__title_image__')
        .order('created_at', { ascending: false });
      
      if (simpleError) {
        console.error('Error fetching roll photos:', simpleError);
        // Return only profile photos if roll photos fail
        return profilePhotos || [];
      }
      
      // Filter client-side: get roll info and check if public
      const filteredPhotos = [];
      for (const photo of simpleData || []) {
        const { data: rollData } = await supabase
          .from('rolls')
          .select('is_public, release_date')
          .eq('id', photo.roll_id)
          .single();
        
        if (rollData?.is_public) {
          // Check if release_date has passed or is null
          if (!rollData.release_date || new Date(rollData.release_date) <= new Date(now)) {
            filteredPhotos.push(photo);
          }
        }
      }
      
      // Combine profile photos and filtered roll photos
      const allPhotos = [
        ...(profilePhotos || []),
        ...filteredPhotos
      ];
      
      // Sort by created_at descending
      return allPhotos.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB - dateA;
      });
    }

    // Filter photos where roll is public and release_date has passed
    const publicRollPhotos = (rollPhotos || []).filter(photo => {
      const roll = photo.rolls;
      if (!roll || !roll.is_public) return false;
      // Photos are visible if release_date is null or in the past
      if (!roll.release_date) return true;
      return new Date(roll.release_date) <= new Date(now);
    });

    // Combine profile photos and public roll photos
    const allPhotos = [
      ...(profilePhotos || []),
      ...publicRollPhotos
    ];

    // Sort by created_at descending
    return allPhotos.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error fetching public photos:', error);
    throw error;
  }
};

/**
 * Get all photos for a user (including private ones - for own profile)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of all photos
 */
export const getUserPhotos = async (userId) => {
  try {
    // First try with the join to get roll info
    // Exclude title images - they're separate and stored in rolls.title_image_url
    let query = supabase
      .from('roll_images')
      .select('id, image_url, caption, created_at, roll_id, rolls(title, is_public)')
      .eq('contributor_id', userId)
      .neq('caption', '__title_image__')
      .order('created_at', { ascending: false })
      .limit(50);

    const { data, error } = await query;

    // If the join fails (maybe is_public column doesn't exist), try without it
    if (error && (error.message?.includes('is_public') || error.code === 'PGRST116')) {
      console.log('Retrying without is_public column...');
      // Exclude title images - they're separate and stored in rolls.title_image_url
      const { data: simpleData, error: simpleError } = await supabase
        .from('roll_images')
        .select('id, image_url, caption, created_at, roll_id, rolls(title)')
        .eq('contributor_id', userId)
        .neq('caption', '__title_image__')
        .order('created_at', { ascending: false })
        .limit(50);

      if (simpleError) throw simpleError;
      return simpleData || [];
    }

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user photos:', error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

/**
 * Upload profile image
 * @param {string} userId - User ID
 * @param {string} imagePath - Local file path or URI
 * @param {string} base64Data - Optional base64 data (preferred for Android content:// URIs)
 * @returns {Promise<string>} Public URL of uploaded image
 */
export const uploadProfileImage = async (userId, imagePath, base64Data = null) => {
  try {
    // Validate userId
    if (!userId) {
      throw new Error('User ID is required to upload a profile image');
    }

    // Validate userId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.warn('⚠️ User ID does not match UUID format:', userId);
    }

    // Create a unique filename
    const timestamp = Date.now();
    const fileName = `profile_${timestamp}.jpg`;
    // Use simpler path format: {userId}/filename.jpg (in profile-images bucket)
    const storagePath = `${userId}/${fileName}`;

    let uint8Array;

    // If base64 data is provided, use it directly (avoids content:// URI security issues)
    if (base64Data && base64Data.length > 0) {
      console.log('✅ Using base64 data for upload, base64 length:', base64Data.length);
      try {
        // Convert base64 to Uint8Array
        // Remove data URL prefix if present (data:image/jpeg;base64,...)
        let base64String = base64Data;
        if (base64Data.includes(',')) {
          base64String = base64Data.split(',')[1];
        }
        
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        uint8Array = bytes;
        console.log('✅ Profile image converted from base64, size:', uint8Array.length, 'bytes');
      } catch (base64Error) {
        console.error('❌ Error converting base64:', base64Error);
        throw new Error('Failed to process image data. Please try selecting the image again.');
      }
    } else {
      console.log('⚠️ No base64 data provided, will try to read from URI');
      console.log('This may cause security errors on Android. Base64 is preferred.');
      // Fallback to reading from file URI
      console.log('Uploading profile image from URI:', imagePath);

      // Handle different URI types on Android
      let fileUri = imagePath;
      
      // For content:// URIs (Android photo picker), use as-is
      // For file:// URIs, use as-is
      // For plain paths, add file:// prefix
      if (!imagePath.startsWith('file://') && !imagePath.startsWith('content://')) {
        fileUri = `file://${imagePath}`;
      }

      console.log('Reading file from URI:', fileUri);

      // Read the file - fetch() should work with both file:// and content:// URIs in React Native
      let response;
      try {
        response = await fetch(fileUri);
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        // If fetch fails with content:// URI, suggest using base64
        if (imagePath.startsWith('content://')) {
          throw new Error(
            'Failed to read image file from content URI.\n\n' +
            'Please try selecting the image again. If the issue persists, the app may need to be updated.'
          );
        }
        throw fetchError;
      }
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Response error:', response.status, response.statusText, errorText);
        throw new Error(
          `Failed to read file: ${response.status} ${response.statusText}\n\n` +
          'This may be a security/permission issue. Please try selecting the image again.'
        );
      }

      // In React Native, we can use response.arrayBuffer() directly
      const arrayBuffer = await response.arrayBuffer();
      uint8Array = new Uint8Array(arrayBuffer);
      
      console.log('Profile image converted from file, size:', uint8Array.length, 'bytes');
    }

    // Upload to Supabase Storage
    console.log('📤 Uploading profile image to Supabase Storage:', {
      bucket: 'profile-images',
      path: storagePath,
      pathSegments: storagePath.split('/'),
      expectedFirstSegment: userId,
      actualFirstSegment: storagePath.split('/')[0],
      size: uint8Array.length,
      contentType: 'image/jpeg',
      userId: userId,
    });
    
    // Verify path format matches policy expectations
    const pathSegments = storagePath.split('/');
    if (pathSegments[0] !== userId) {
      console.warn('⚠️ WARNING: Path first segment does not match userId');
      console.warn('Expected:', userId, 'Got:', pathSegments[0]);
    }

    const { data, error } = await supabase.storage
      .from('profile-images') // Separate bucket for profile images
      .upload(storagePath, uint8Array, {
        contentType: 'image/jpeg',
        upsert: true, // Allow overwriting
      });

    if (error) {
      console.error('Supabase Storage upload error:', error);
      console.error('Error code:', error.error || error.statusCode);
      console.error('Error message:', error.message);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Upload path attempted:', storagePath);
      console.error('Bucket:', 'roll-images');
      
      // Extract error message more reliably
      let errorMessage = error.message || error.error || 'Unknown storage error';
      const errorCode = error.error || error.statusCode || '';
      
      // Check for specific error types
      if (errorMessage?.includes('security') || 
          errorMessage?.includes('permission') || 
          errorMessage?.includes('policy') ||
          errorMessage?.includes('row-level security') ||
          errorCode === '403' ||
          errorCode === 'new row violates row-level security policy') {
        throw new Error(
          'Storage permission error. The storage policy may not allow profile image uploads.\n\n' +
          'Please verify in Supabase Dashboard → Storage → profile-images → Policies that:\n' +
          '1. The "profile-images" bucket exists\n' +
          '2. The upload policy allows paths starting with "{your-user-id}/"\n\n' +
          'Error: ' + errorMessage + (errorCode ? ` (Code: ${errorCode})` : '')
        );
      }
      if (errorMessage?.includes('bucket') || errorMessage?.includes('not found') || errorCode === '404') {
        throw new Error(
          'Storage bucket not found. Please ensure the "profile-images" bucket exists in Supabase Storage.\n\n' +
          'Go to Supabase Dashboard → Storage → New bucket → Name: "profile-images" → Public: ON'
        );
      }
      throw new Error(`Storage upload failed: ${errorMessage}${errorCode ? ` (${errorCode})` : ''}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(data.path);

    // Note: We don't update the profile here - let the caller do it
    // This allows the EditProfileScreen to update all fields together
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw error;
  }
};

/**
 * Make a roll public
 * @param {string} rollId - Roll ID
 * @param {boolean} isPublic - Whether to make it public
 * @returns {Promise<void>}
 */
export const setRollPublic = async (rollId, isPublic) => {
  try {
    const { error } = await supabase
      .from('rolls')
      .update({ is_public: isPublic })
      .eq('id', rollId);

    if (error) {
      if (
        error.message?.includes('is_public') ||
        error.message?.toLowerCase()?.includes('schema cache')
      ) {
        throw new Error(
          'Database is missing the `rolls.is_public` column.\n\n' +
            'Run `PUBLIC_PROFILE_SETUP.sql` (or `ROLLS_PUBLIC_AND_TITLE_IMAGE_MIGRATION.sql`) in Supabase, then try again.'
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error setting roll public:', error);
    throw error;
  }
};

/**
 * Make a photo public
 * NOTE: This function is deprecated - photos are now public based on their roll's is_public and release_date
 * Standalone public photos are stored in public_profile_photos table and are always public
 * @param {string} imageId - Image ID
 * @param {boolean} isPublic - Whether to make it public
 * @returns {Promise<void>}
 * @deprecated This function is no longer used - photos visibility is controlled by roll settings
 */
export const setPhotoPublic = async (imageId, isPublic) => {
  console.warn('setPhotoPublic is deprecated - photo visibility is now controlled by roll settings');
  // This function is kept for backwards compatibility but does nothing
  // Photo visibility is now determined by:
  // 1. For roll images: the roll's is_public flag and release_date
  // 2. For standalone photos: they're always public (stored in public_profile_photos)
  return;
};

/**
 * Follow a user
 * @param {string} userId - User ID to follow
 * @returns {Promise<void>}
 */
export const followUser = async (userId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('follows')
      .insert([{ follower_id: user.id, following_id: userId }]);

    if (error) throw error;
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
};

/**
 * Unfollow a user
 * @param {string} userId - User ID to unfollow
 * @returns {Promise<void>}
 */
export const unfollowUser = async (userId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw error;
  }
};

/**
 * Check if current user is following a user
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>}
 */
export const isFollowing = async (userId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return !!data;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
};

/**
 * Upload a standalone public profile photo (not attached to any roll)
 * @param {string} userId - User ID
 * @param {string} imagePath - Local file path or URI
 * @param {string} base64Data - Optional base64 data (preferred for Android content:// URIs)
 * @param {string} caption - Optional caption
 * @returns {Promise<string>} Public URL of uploaded image
 */
export const uploadPublicProfilePhoto = async (userId, imagePath, base64Data = null, caption = null) => {
  try {
    // Validate userId
    if (!userId) {
      throw new Error('User ID is required to upload a public profile photo');
    }

    // Import uploadRollImage to reuse the upload logic
    // We'll upload to a special "public-photos" folder in roll-images bucket
    // Or we could use a separate bucket, but for now use roll-images with a special path
    const { uploadRollImage } = await import('./storage');
    
    // Create a unique filename
    const timestamp = Date.now();
    const fileName = `public_photo_${timestamp}.jpg`;
    // Use a special path format: public-photos/{userId}/filename.jpg
    // This keeps it separate from roll photos
    const specialRollId = `public-photos/${userId}`;
    
    // Upload image using the storage service
    // We'll need to modify the path handling, but for now let's create a simpler approach
    // Actually, let's upload directly to storage and then insert into the table
    
    let uint8Array;

    // If base64 data is provided, use it directly
    if (base64Data && base64Data.length > 0) {
      console.log('✅ Using base64 data for public profile photo upload');
      try {
        let base64String = base64Data;
        if (base64Data.includes(',')) {
          base64String = base64Data.split(',')[1];
        }
        
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        uint8Array = bytes;
      } catch (base64Error) {
        console.error('❌ Error converting base64:', base64Error);
        throw new Error('Failed to process image data. Please try selecting the image again.');
      }
    } else {
      // Fallback to reading from file URI
      let fileUri = imagePath;
      if (!imagePath.startsWith('file://') && !imagePath.startsWith('content://')) {
        fileUri = `file://${imagePath}`;
      }

      const response = await fetch(fileUri);
      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      uint8Array = new Uint8Array(arrayBuffer);
    }

    // Upload to Supabase Storage - use dedicated profile-photos bucket
    // Path format: {userId}/filename.jpg (simpler, no prefix needed)
    const storagePath = `${userId}/${fileName}`;
    console.log('📤 Uploading public profile photo to profile-photos bucket:', storagePath);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-photos') // Dedicated bucket for public profile photos (like Instagram posts)
      .upload(storagePath, uint8Array, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      throw new Error(
        `Failed to upload photo: ${uploadError.message}\n\n` +
        `Make sure the 'profile-photos' bucket exists in Supabase Storage.\n` +
        `See CREATE_PROFILE_PHOTOS_BUCKET.md for setup instructions.`
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(uploadData.path);

    const imageUrl = urlData.publicUrl;

    // Insert into public_profile_photos table
    const { data: photoData, error: insertError } = await supabase
      .from('public_profile_photos')
      .insert([
        {
          user_id: userId,
          image_url: imageUrl,
          caption: caption || null,
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting public profile photo:', insertError);
      // Try to clean up the uploaded file
      try {
        await supabase.storage
          .from('profile-photos')
          .remove([uploadData.path]);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
      throw new Error(`Failed to save photo: ${insertError.message}`);
    }

    console.log('✅ Public profile photo uploaded successfully');
    return imageUrl;
  } catch (error) {
    console.error('Error uploading public profile photo:', error);
    throw error;
  }
};
