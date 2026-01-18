import { supabase } from '../lib/supabase';

/**
 * Photo types supported for likes/comments
 */
export const PHOTO_TYPES = {
  PROFILE_PHOTO: 'profile_photo',
  ROLL_IMAGE: 'roll_image',
};

/**
 * Like a photo
 * @param {string} photoId - Photo ID (from public_profile_photos or roll_images)
 * @param {string} photoType - 'profile_photo' or 'roll_image'
 * @param {string} userId - User ID who is liking
 * @returns {Promise<Object>} Created like object
 */
export const likePhoto = async (photoId, photoType, userId) => {
  try {
    const { data, error } = await supabase
      .from('photo_likes')
      .insert([
        {
          photo_id: photoId,
          photo_type: photoType,
          user_id: userId,
        },
      ])
      .select()
      .single();

    if (error) {
      // If table doesn't exist yet, show helpful message
      if (error.code === 'PGRST205') {
        console.warn('⚠️ photo_likes table not found - run CREATE_LIKES_COMMENTS_TABLES.sql in Supabase');
        throw new Error('Likes feature not available yet. Please run CREATE_LIKES_COMMENTS_TABLES.sql in Supabase SQL Editor.');
      }
      // If already liked, that's okay - just return existing like
      if (error.code === '23505') {
        // Unique constraint violation - already liked
        const { data: existingLike } = await supabase
          .from('photo_likes')
          .select()
          .eq('photo_id', photoId)
          .eq('photo_type', photoType)
          .eq('user_id', userId)
          .single();
        return existingLike;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error liking photo:', error);
    throw error;
  }
};

/**
 * Unlike a photo
 * @param {string} photoId - Photo ID
 * @param {string} photoType - 'profile_photo' or 'roll_image'
 * @param {string} userId - User ID who is unliking
 * @returns {Promise<void>}
 */
export const unlikePhoto = async (photoId, photoType, userId) => {
  try {
    const { error } = await supabase
      .from('photo_likes')
      .delete()
      .eq('photo_id', photoId)
      .eq('photo_type', photoType)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error unliking photo:', error);
    throw error;
  }
};

/**
 * Check if a user has liked a photo
 * @param {string} photoId - Photo ID
 * @param {string} photoType - 'profile_photo' or 'roll_image'
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} True if user has liked the photo
 */
export const hasUserLikedPhoto = async (photoId, photoType, userId) => {
  try {
    const { data, error } = await supabase
      .from('photo_likes')
      .select('id')
      .eq('photo_id', photoId)
      .eq('photo_type', photoType)
      .eq('user_id', userId)
      .single();

    if (error) {
      // If table doesn't exist yet, return false
      if (error.code === 'PGRST205') {
        return false;
      }
      // PGRST116 = no rows returned, which means not liked
      if (error.code === 'PGRST116') {
        return false;
      }
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking like status:', error);
    return false;
  }
};

/**
 * Get like count for a photo
 * @param {string} photoId - Photo ID
 * @param {string} photoType - 'profile_photo' or 'roll_image'
 * @returns {Promise<number>} Number of likes
 */
export const getPhotoLikeCount = async (photoId, photoType) => {
  try {
    const { count, error } = await supabase
      .from('photo_likes')
      .select('*', { count: 'exact', head: true })
      .eq('photo_id', photoId)
      .eq('photo_type', photoType);

    if (error) {
      // If table doesn't exist yet, return 0
      if (error.code === 'PGRST205') {
        return 0;
      }
      throw error;
    }
    return count || 0;
  } catch (error) {
    console.error('Error getting like count:', error);
    return 0;
  }
};

/**
 * Get likes for multiple photos at once
 * @param {Array} photos - Array of { id, type } objects
 * @param {string} userId - User ID to check likes for
 * @returns {Promise<Map>} Map of photoId -> { liked: boolean, count: number }
 */
export const getPhotosLikeStatus = async (photos, userId) => {
  try {
    const resultMap = new Map();

    // Get all photo IDs and types
    const photoIds = photos.map(p => p.id);
    const photoTypes = [...new Set(photos.map(p => p.type))];

    // Get like counts for all photos
    for (const photoType of photoTypes) {
      const photosOfType = photos.filter(p => p.type === photoType);
      const idsOfType = photosOfType.map(p => p.id);

      if (idsOfType.length === 0) continue;

      // Get counts
      const { data: likesData, error: likesError } = await supabase
        .from('photo_likes')
        .select('photo_id, user_id')
        .in('photo_id', idsOfType)
        .eq('photo_type', photoType);

      if (likesError) {
        // If table doesn't exist yet, that's OK - just return empty results
        if (likesError.code === 'PGRST205') {
          console.log('⚠️ photo_likes table not found - run CREATE_LIKES_COMMENTS_TABLES.sql');
          // Return empty map with defaults
          photosOfType.forEach(photo => {
            resultMap.set(photo.id, { liked: false, count: 0 });
          });
          continue;
        }
        console.error('Error fetching likes:', likesError);
        continue;
      }

      // Count likes per photo
      const likeCounts = new Map();
      const userLikes = new Set();

      if (likesData) {
        likesData.forEach(like => {
          const count = likeCounts.get(like.photo_id) || 0;
          likeCounts.set(like.photo_id, count + 1);

          if (like.user_id === userId) {
            userLikes.add(like.photo_id);
          }
        });
      }

      // Populate result map
      photosOfType.forEach(photo => {
        resultMap.set(photo.id, {
          liked: userLikes.has(photo.id),
          count: likeCounts.get(photo.id) || 0,
        });
      });
    }

    // Ensure all photos have an entry
    photos.forEach(photo => {
      if (!resultMap.has(photo.id)) {
        resultMap.set(photo.id, { liked: false, count: 0 });
      }
    });

    return resultMap;
  } catch (error) {
    console.error('Error getting photos like status:', error);
    // Return empty map with defaults
    const resultMap = new Map();
    photos.forEach(photo => {
      resultMap.set(photo.id, { liked: false, count: 0 });
    });
    return resultMap;
  }
};

/**
 * Add a comment to a photo
 * @param {string} photoId - Photo ID
 * @param {string} photoType - 'profile_photo' or 'roll_image'
 * @param {string} userId - User ID who is commenting
 * @param {string} commentText - Comment text
 * @returns {Promise<Object>} Created comment object
 */
export const addComment = async (photoId, photoType, userId, commentText) => {
  try {
    if (!commentText || !commentText.trim()) {
      throw new Error('Comment text is required');
    }

    // Validate character limit (500 characters)
    const trimmedText = commentText.trim();
    if (trimmedText.length > 500) {
      throw new Error('Comment must be 500 characters or less');
    }

    // Get user info for the comment
    const { data: userData } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .eq('id', userId)
      .single();

    const { data, error } = await supabase
      .from('photo_comments')
      .insert([
        {
          photo_id: photoId,
          photo_type: photoType,
          user_id: userId,
          comment_text: trimmedText,
        },
      ])
      .select()
      .single();

    if (error) {
      // If table doesn't exist yet, show helpful message
      if (error.code === 'PGRST205') {
        throw new Error('Comments feature not available yet. Please run CREATE_LIKES_COMMENTS_TABLES.sql in Supabase SQL Editor.');
      }
      throw error;
    }

    // Include user info in response
    return {
      ...data,
      user: userData || null,
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

/**
 * Get comments for a photo
 * @param {string} photoId - Photo ID
 * @param {string} photoType - 'profile_photo' or 'roll_image'
 * @param {Object} options - Query options
 * @param {number} options.limit - Max number of comments (default: 50)
 * @param {number} options.offset - Offset for pagination (default: 0)
 * @returns {Promise<Array>} Array of comment objects with user info
 */
export const getPhotoComments = async (photoId, photoType, options = {}) => {
  try {
    const { limit = 50, offset = 0 } = options;

    // First, get the comments
    const { data: commentsData, error: commentsError } = await supabase
      .from('photo_comments')
      .select('id, comment_text, created_at, updated_at, user_id')
      .eq('photo_id', photoId)
      .eq('photo_type', photoType)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (commentsError) {
      // If table doesn't exist yet, return empty array
      if (commentsError.code === 'PGRST205') {
        return [];
      }
      throw commentsError;
    }

    if (!commentsData || commentsData.length === 0) {
      return [];
    }

    // Get unique user IDs
    const userIds = [...new Set(commentsData.map(c => c.user_id))];

    // Fetch user data for all comment authors
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds);

    if (usersError) {
      console.warn('Error fetching user data for comments:', usersError);
    }

    // Create a map of user_id to user data
    const userMap = new Map();
    if (usersData) {
      usersData.forEach(user => {
        userMap.set(user.id, user);
      });
    }

    // Combine comments with user data
    return commentsData.map(comment => ({
      id: comment.id,
      comment_text: comment.comment_text,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      user_id: comment.user_id,
      user: userMap.get(comment.user_id) || null,
    }));
  } catch (error) {
    console.error('Error getting comments:', error);
    return [];
  }
};

/**
 * Delete a comment
 * @param {string} commentId - Comment ID
 * @param {string} userId - User ID (must be the comment author)
 * @returns {Promise<void>}
 */
export const deleteComment = async (commentId, userId) => {
  try {
    const { error } = await supabase
      .from('photo_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId); // Ensure user can only delete their own comments

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

/**
 * Get comment count for a photo
 * @param {string} photoId - Photo ID
 * @param {string} photoType - 'profile_photo' or 'roll_image'
 * @returns {Promise<number>} Number of comments
 */
export const getPhotoCommentCount = async (photoId, photoType) => {
  try {
    const { count, error } = await supabase
      .from('photo_comments')
      .select('*', { count: 'exact', head: true })
      .eq('photo_id', photoId)
      .eq('photo_type', photoType);

    if (error) {
      // If table doesn't exist yet, return 0
      if (error.code === 'PGRST205') {
        return 0;
      }
      throw error;
    }
    return count || 0;
  } catch (error) {
    console.error('Error getting comment count:', error);
    return 0;
  }
};
