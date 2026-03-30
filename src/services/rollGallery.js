import { supabase } from '../lib/supabase';
import { getRollImageUrlAsync } from './storage';
import { getPhotosLikeStatus, getPhotoCommentCount, PHOTO_TYPES } from './interactions';

/**
 * Contributor photos for a roll (newest first), with resolved URLs and interaction hints.
 * Used by PhotoViewer and (via re-export) newsfeed-related flows.
 */
export const getRollGalleryPhotos = async (rollId, currentUserId = null) => {
  try {
    const { data, error } = await supabase
      .from('roll_images')
      .select('id, image_url, caption, created_at, contributor_id')
      .eq('roll_id', rollId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('getRollGalleryPhotos roll_images error:', error.code, error.message, error.details);
      return [];
    }

    const rows = (data || []).filter((r) => r.caption !== '__title_image__');
    if (rows.length === 0) return [];

    const contributorIds = [...new Set(rows.map((r) => r.contributor_id).filter(Boolean))];
    const userMap = new Map();
    if (contributorIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', contributorIds);
      if (usersData) {
        usersData.forEach((u) => userMap.set(u.id, u));
      }
    }

    const photoRefs = rows.map((r) => ({ id: r.id, type: PHOTO_TYPES.ROLL_IMAGE }));
    const likeMap = await getPhotosLikeStatus(photoRefs, currentUserId || '');

    const commentCounts = await Promise.all(
      rows.map((r) => getPhotoCommentCount(r.id, PHOTO_TYPES.ROLL_IMAGE).catch(() => 0)),
    );

    const enriched = rows.map((r, index) => {
      const st = likeMap.get(r.id) || { liked: false, count: 0 };
      const u = userMap.get(r.contributor_id);
      return {
        ...r,
        likeCount: st.count,
        liked: st.liked,
        commentCount: commentCounts[index] || 0,
        username: u?.username ?? null,
        displayName: u?.display_name ?? null,
        avatarUrl: u?.avatar_url ?? null,
      };
    });

    return Promise.all(
      enriched.map(async (r) => ({
        id: r.id,
        imageUrl: await getRollImageUrlAsync(r.image_url, 'roll'),
        caption: r.caption || '',
        contributorId: r.contributor_id,
        username: r.username,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        likeCount: r.likeCount,
        liked: r.liked,
        commentCount: r.commentCount,
        createdAt: r.created_at,
      })),
    );
  } catch (e) {
    console.error('getRollGalleryPhotos', e);
    return [];
  }
};
