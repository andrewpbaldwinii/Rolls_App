import { supabase } from '../lib/supabase';
import { getRollImageUrlAsync } from './storage';

/**
 * Newsfeed item types
 */
export const NEWSFEED_ITEM_TYPES = {
  PROFILE_PHOTO: 'profile_photo',
  ROLL_IMAGE: 'roll_image',
};

/**
 * Get newsfeed items (public images) with pagination
 * Combines:
 * 1. Public profile photos (from public_profile_photos table)
 * 2. Images from public rolls where release_date has passed (developed)
 * 
 * Prioritizes content from users the current user is following.
 * 
 * @param {Object} options - Pagination options
 * @param {number} options.page - Page number (0-indexed)
 * @param {number} options.pageSize - Number of items per page (default: 20)
 * @param {string} options.beforeDate - Optional: Only fetch items before this date (for pagination)
 * @param {string} options.currentUserId - Current user ID (optional, for follower prioritization)
 * @returns {Promise<Object>} { items, hasMore, nextPage }
 */
export const getNewsfeedItems = async ({ page = 0, pageSize = 20, beforeDate = null, currentUserId = null } = {}) => {
  try {
    const now = new Date().toISOString();
    const limit = pageSize;
    const offset = page * pageSize;
    
    // Get list of users current user is following (for prioritization)
    let followingUserIds = [];
    if (currentUserId) {
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);
      
      followingUserIds = (followingData || []).map(f => f.following_id);
      console.log(`📊 User is following ${followingUserIds.length} users`);
    }
    
    // Fetch public profile photos from ALL users
    let profilePhotos = [];
    try {
      // Try simple query first (more reliable)
      let profileQuery = supabase
        .from('public_profile_photos')
        .select('id, image_url, caption, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get more to account for potential filtering
      
      if (beforeDate) {
        profileQuery = profileQuery.lt('created_at', beforeDate);
      }
      
      const { data, error } = await profileQuery;
      
      if (error) {
        console.error('❌ Error fetching public profile photos:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
      } else if (data) {
        console.log(`✅ Fetched ${data.length} public profile photos`);
        
        // Get user info for each photo (batch by unique user_ids)
        const uniqueUserIds = [...new Set(data.map(photo => photo.user_id))];
        const userMap = new Map();
        
        // Fetch all users at once
        if (uniqueUserIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url')
            .in('id', uniqueUserIds);
          
          if (usersData) {
            usersData.forEach(user => {
              userMap.set(user.id, user);
            });
          }
        }
        
        // Map photos with user info
        profilePhotos = data.map(photo => {
          const userInfo = userMap.get(photo.user_id);
          return {
            id: photo.id,
            type: NEWSFEED_ITEM_TYPES.PROFILE_PHOTO,
            imageUrl: photo.image_url,
            caption: photo.caption,
            createdAt: photo.created_at,
            userId: photo.user_id,
            username: userInfo?.username || null,
            displayName: userInfo?.display_name || null,
            avatarUrl: userInfo?.avatar_url || null,
          };
        });
      } else {
        console.log('No public profile photos found');
      }
    } catch (err) {
      // Table might not exist - that's OK
      if (err.code !== 'PGRST205' && !err.message?.includes('not found')) {
        console.warn('Error fetching profile photos:', err);
      } else {
        console.log('public_profile_photos table not found or error:', err.message);
      }
    }
    
    // Fetch images from public rolls where release_date has passed
    // Get images from ALL public rolls (not just one user)
    let rollImages = [];
    try {
      // First, get all public rolls where release_date has passed
      const { data: publicRolls, error: rollsError } = await supabase
        .from('rolls')
        .select('id, title, is_public, release_date, creator_id')
        .eq('is_public', true)
        .or(`release_date.is.null,release_date.lte.${now}`);
      
      if (rollsError) {
        console.warn('Error fetching public rolls:', rollsError);
      }
      
      const publicRollIds = (publicRolls || []).map(roll => roll.id);
      
      if (publicRollIds.length === 0) {
        console.log('No public rolls found');
      } else {
        console.log(`Found ${publicRollIds.length} public rolls`);
        
        // Query roll_images from those public rolls
        let rollQuery = supabase
          .from('roll_images')
          .select(`
            id,
            image_url,
            caption,
            created_at,
            roll_id,
            contributor_id
          `)
          .in('roll_id', publicRollIds)
          .neq('caption', '__title_image__') // Exclude title images
          .order('created_at', { ascending: false })
          .limit(limit * 2); // Get more to account for filtering
        
        if (beforeDate) {
          rollQuery = rollQuery.lt('created_at', beforeDate);
        }
        
        const { data, error } = await rollQuery;
      
        if (error) {
          console.warn('Error fetching roll images:', error);
        } else if (data) {
          console.log(`✅ Fetched ${data.length} roll images from public rolls`);
          
          // Create a map of roll_id to roll info for quick lookup
          const rollMap = new Map();
          (publicRolls || []).forEach(roll => {
            rollMap.set(roll.id, roll);
          });
          
          // Get user info for each image
          rollImages = await Promise.all(
            data.map(async (image) => {
              const roll = rollMap.get(image.roll_id);
              
              // Get contributor user info
              const { data: userData } = await supabase
                .from('users')
                .select('username, display_name, avatar_url')
                .eq('id', image.contributor_id)
                .single();
              
              return {
                id: image.id,
                type: NEWSFEED_ITEM_TYPES.ROLL_IMAGE,
                imageUrl: image.image_url,
                caption: image.caption,
                createdAt: image.created_at,
                rollId: image.roll_id,
                rollTitle: roll?.title || null,
                userId: image.contributor_id,
                username: userData?.username || null,
                displayName: userData?.display_name || null,
                avatarUrl: userData?.avatar_url || null,
              };
            })
          );
        }
      }
    } catch (err) {
      console.warn('Error fetching roll images:', err);
    }
    
    // Combine and sort: followers first, then by date
    const allItems = [...profilePhotos, ...rollImages].sort((a, b) => {
      const aIsFollowing = followingUserIds.includes(a.userId);
      const bIsFollowing = followingUserIds.includes(b.userId);
      
      // Prioritize followed users
      if (aIsFollowing && !bIsFollowing) return -1; // a comes first
      if (!aIsFollowing && bIsFollowing) return 1;  // b comes first
      
      // Both same priority, sort by date (newest first)
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA;
    });
    
    console.log(`📊 Newsfeed totals: ${profilePhotos.length} profile photos, ${rollImages.length} roll images, ${allItems.length} total items`);
    
    // Apply pagination
    const paginatedItems = allItems.slice(offset, offset + limit);
    
    console.log(`📄 Pagination: page ${page}, showing ${paginatedItems.length} items (offset: ${offset}, limit: ${limit})`);
    
    // Process image URLs (get signed URLs for roll images, public URLs for profile photos)
    const processedItems = await Promise.all(
      paginatedItems.map(async (item) => {
        try {
          // Profile photos are in public bucket, roll images need signed URLs
          let processedUrl = item.imageUrl;
          
          if (item.type === NEWSFEED_ITEM_TYPES.ROLL_IMAGE) {
            // Roll images need signed URLs (private bucket)
            processedUrl = await getRollImageUrlAsync(item.imageUrl, 'roll');
          } else if (item.type === NEWSFEED_ITEM_TYPES.PROFILE_PHOTO) {
            // Profile photos might be in profile-images bucket (public) or public_profile_photos
            // If it's already a full URL, use it; otherwise try to process it
            if (item.imageUrl && !item.imageUrl.startsWith('http')) {
              // Might be a path, try to get public URL
              try {
                processedUrl = await getRollImageUrlAsync(item.imageUrl, 'profile');
              } catch (err) {
                // If processing fails, use original
                console.warn('Could not process profile photo URL:', err);
              }
            }
          }
          
          return {
            ...item,
            imageUrl: processedUrl || item.imageUrl,
          };
        } catch (err) {
          console.warn('Error processing image URL:', err);
          return item;
        }
      })
    );
    
    // Determine if there are more items
    const hasMore = allItems.length > offset + limit;
    const nextPage = hasMore ? page + 1 : null;
    
    return {
      items: processedItems,
      hasMore,
      nextPage,
      totalCount: allItems.length,
    };
  } catch (error) {
    console.error('Error fetching newsfeed items:', error);
    throw error;
  }
};

/**
 * Get initial newsfeed items (first page)
 * @param {number} pageSize - Number of items per page
 * @param {string} currentUserId - Current user ID (optional, for follower prioritization)
 * @returns {Promise<Object>} Newsfeed data
 */
export const getInitialNewsfeed = async (pageSize = 20, currentUserId = null) => {
  return getNewsfeedItems({ page: 0, pageSize, currentUserId });
};
