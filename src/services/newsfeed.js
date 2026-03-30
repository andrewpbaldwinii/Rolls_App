import { supabase } from '../lib/supabase';
import { getRollImageUrlAsync } from './storage';
import { getRollGalleryPhotos } from './rollGallery';

/**
 * Newsfeed item types
 */
export const NEWSFEED_ITEM_TYPES = {
  PROFILE_PHOTO: 'profile_photo',
  /** One card per developed public roll; `imageUrl` is title image */
  PUBLIC_ROLL: 'public_roll',
};

/** @deprecated Prefer getRollGalleryPhotos from ./rollGallery — alias kept for any old imports */
export const getRollPhotosForNewsfeedModal = getRollGalleryPhotos;

/**
 * Get newsfeed items (public images) with pagination
 * Combines:
 * 1. Public profile photos (from public_profile_photos table)
 * 2. One card per developed public roll (title image + description for overlay), release window respected
 *
 * Prioritizes content from users the current user is following.
 */
export const getNewsfeedItems = async ({
  page = 0,
  pageSize = 20,
  beforeDate = null,
  currentUserId = null,
} = {}) => {
  try {
    const now = new Date().toISOString();
    const limit = pageSize;
    const offset = page * pageSize;

    let followingUserIds = [];
    if (currentUserId) {
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);

      followingUserIds = (followingData || []).map((f) => f.following_id);
      console.log(`📊 User is following ${followingUserIds.length} users`);
    }

    const fetchCap = Math.max(limit * 2, (page + 2) * limit);

    let profilePhotos = [];
    try {
      let profileQuery = supabase
        .from('public_profile_photos')
        .select('id, image_url, caption, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(fetchCap);

      if (beforeDate) {
        profileQuery = profileQuery.lt('created_at', beforeDate);
      }

      const { data, error } = await profileQuery;

      if (error) {
        console.error('❌ Error fetching public profile photos:', error);
      } else if (data) {
        const uniqueUserIds = [...new Set(data.map((photo) => photo.user_id))];
        const userMap = new Map();

        if (uniqueUserIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url')
            .in('id', uniqueUserIds);

          if (usersData) {
            usersData.forEach((u) => {
              userMap.set(u.id, u);
            });
          }
        }

        profilePhotos = data.map((photo) => {
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
      }
    } catch (err) {
      if (err.code !== 'PGRST205' && !err.message?.includes('not found')) {
        console.warn('Error fetching profile photos:', err);
      }
    }

    let publicRollCards = [];
    try {
      let rollsQuery = supabase
        .from('rolls')
        .select(
          'id, title, description, title_image_url, release_date, created_at, creator_id',
        )
        .eq('is_public', true)
        .eq('status', 'developed')
        .not('title_image_url', 'is', null)
        .or(`release_date.is.null,release_date.lte.${now}`)
        .order('created_at', { ascending: false })
        .limit(fetchCap);

      if (beforeDate) {
        rollsQuery = rollsQuery.lt('created_at', beforeDate);
      }

      const { data: publicRolls, error: rollsError } = await rollsQuery;

      if (rollsError) {
        console.warn('Error fetching developed public rolls:', rollsError);
      } else if (publicRolls?.length) {
        const creatorIds = [...new Set(publicRolls.map((r) => r.creator_id).filter(Boolean))];
        const userMap = new Map();
        if (creatorIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url')
            .in('id', creatorIds);
          if (usersData) {
            usersData.forEach((u) => userMap.set(u.id, u));
          }
        }

        publicRollCards = publicRolls
          .filter((r) => r.title_image_url && String(r.title_image_url).trim() !== '')
          .map((roll) => {
            const userInfo = userMap.get(roll.creator_id);
            const sortDate = roll.release_date || roll.created_at;
            const desc =
              roll.description && String(roll.description).trim() !== ''
                ? String(roll.description).trim()
                : null;
            return {
              id: `public-roll-${roll.id}`,
              type: NEWSFEED_ITEM_TYPES.PUBLIC_ROLL,
              rollId: roll.id,
              imageUrl: roll.title_image_url,
              caption: null,
              rollTitle: roll.title,
              rollCaption: desc,
              createdAt: sortDate,
              userId: roll.creator_id,
              username: userInfo?.username || null,
              displayName: userInfo?.display_name || null,
              avatarUrl: userInfo?.avatar_url || null,
            };
          });
      }
    } catch (err) {
      console.warn('Error building public roll feed cards:', err);
    }

    const allItems = [...profilePhotos, ...publicRollCards].sort((a, b) => {
      const aIsFollowing = followingUserIds.includes(a.userId);
      const bIsFollowing = followingUserIds.includes(b.userId);
      if (aIsFollowing && !bIsFollowing) return -1;
      if (!aIsFollowing && bIsFollowing) return 1;
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA;
    });

    console.log(
      `📊 Newsfeed totals: ${profilePhotos.length} profile photos, ${publicRollCards.length} public rolls, ${allItems.length} merged`,
    );

    const paginatedItems = allItems.slice(offset, offset + limit);

    const processedItems = await Promise.all(
      paginatedItems.map(async (item) => {
        try {
          let processedUrl = item.imageUrl;

          if (item.type === NEWSFEED_ITEM_TYPES.PUBLIC_ROLL) {
            processedUrl = await getRollImageUrlAsync(item.imageUrl, 'title');
          } else if (item.type === NEWSFEED_ITEM_TYPES.PROFILE_PHOTO) {
            if (item.imageUrl && !item.imageUrl.startsWith('http')) {
              try {
                processedUrl = await getRollImageUrlAsync(item.imageUrl, 'profile');
              } catch (err) {
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
      }),
    );

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

export const getInitialNewsfeed = async (pageSize = 20, currentUserId = null) => {
  return getNewsfeedItems({ page: 0, pageSize, currentUserId });
};
