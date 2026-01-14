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
        const { count: photosCount, error: photosError } = await supabase
          .from('roll_images')
          .select('*', { count: 'exact', head: true })
          .eq('contributor_id', userId);
        
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

        const { count: photosCount } = await supabase
          .from('roll_images')
          .select('*', { count: 'exact', head: true })
          .eq('contributor_id', userId);
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
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of public rolls
 */
export const getPublicRolls = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('rolls')
      .select('id, title, description, created_at, is_public')
      .eq('creator_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching public rolls:', error);
    throw error;
  }
};

/**
 * Get public photos for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of public photos
 */
export const getPublicPhotos = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('roll_images')
      .select('id, image_url, caption, created_at, roll_id, rolls(title)')
      .eq('contributor_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
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
    let query = supabase
      .from('roll_images')
      .select('id, image_url, caption, created_at, roll_id, rolls(title, is_public)')
      .eq('contributor_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data, error } = await query;

    // If the join fails (maybe is_public column doesn't exist), try without it
    if (error && (error.message?.includes('is_public') || error.code === 'PGRST116')) {
      console.log('Retrying without is_public column...');
      const { data: simpleData, error: simpleError } = await supabase
        .from('roll_images')
        .select('id, image_url, caption, created_at, roll_id, rolls(title)')
        .eq('contributor_id', userId)
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

    if (error) throw error;
  } catch (error) {
    console.error('Error setting roll public:', error);
    throw error;
  }
};

/**
 * Make a photo public
 * @param {string} imageId - Image ID
 * @param {boolean} isPublic - Whether to make it public
 * @returns {Promise<void>}
 */
export const setPhotoPublic = async (imageId, isPublic) => {
  try {
    const { error } = await supabase
      .from('roll_images')
      .update({ is_public: isPublic })
      .eq('id', imageId);

    if (error) throw error;
  } catch (error) {
    console.error('Error setting photo public:', error);
    throw error;
  }
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

