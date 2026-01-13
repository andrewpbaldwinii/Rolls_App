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

    // Get stats using the function (make it optional in case function doesn't exist)
    let stats = { rolls_created: 0, photos_taken: 0, followers_count: 0 };
    try {
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_user_public_stats', { user_uuid: userId });

      if (!statsError && statsData && statsData[0]) {
        stats = statsData[0];
      } else if (statsError) {
        console.log('Stats function may not exist, using defaults:', statsError.message);
      }
    } catch (e) {
      console.log('Error fetching stats, using defaults:', e.message);
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
 * Upload profile image
 * @param {string} userId - User ID
 * @param {string} imagePath - Local file path
 * @returns {Promise<string>} Public URL of uploaded image
 */
export const uploadProfileImage = async (userId, imagePath) => {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const fileName = `profile_${userId}_${timestamp}.jpg`;
    const storagePath = `profiles/${userId}/${fileName}`;

    // Read the file
    const response = await fetch(`file://${imagePath}`);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('roll-images') // Using same bucket, or create 'profiles' bucket
      .upload(storagePath, uint8Array, {
        contentType: 'image/jpeg',
        upsert: true, // Allow overwriting
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('roll-images')
      .getPublicUrl(data.path);

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', userId);

    if (updateError) throw updateError;

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

