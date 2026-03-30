import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { clearProfileCache } from './publicProfile';

/**
 * Extract storage object path from a Supabase public or signed URL for a bucket.
 */
function pathFromImageUrl(url, bucket) {
  if (!url || typeof url !== 'string') return null;
  const publicMarker = `/object/public/${bucket}/`;
  const signMarker = `/object/sign/${bucket}/`;
  let idx = url.indexOf(publicMarker);
  let len = publicMarker.length;
  if (idx === -1) {
    idx = url.indexOf(signMarker);
    len = signMarker.length;
  }
  if (idx === -1) return null;
  const rest = url.slice(idx + len).split('?')[0];
  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}

/**
 * Recursively remove all objects under a folder prefix in a bucket.
 */
async function removeStoragePrefix(bucket, prefix) {
  const cleanPrefix = (prefix || '').replace(/^\/+|\/+$/g, '');
  const { data: items, error } = await supabase.storage
    .from(bucket)
    .list(cleanPrefix || '', { limit: 500 });

  if (error) {
    console.warn(`[accountDeletion] list ${bucket}/${cleanPrefix}`, error.message);
    return;
  }

  const filePaths = [];
  for (const item of items || []) {
    const childPath = cleanPrefix ? `${cleanPrefix}/${item.name}` : item.name;
    if (item.metadata) {
      filePaths.push(childPath);
    } else {
      await removeStoragePrefix(bucket, childPath);
    }
  }

  if (filePaths.length > 0) {
    const { error: rmErr } = await supabase.storage.from(bucket).remove(filePaths);
    if (rmErr) {
      console.warn(`[accountDeletion] remove ${bucket}`, rmErr.message);
    }
  }
}

/**
 * Delete all Storage files for the current user (profile buckets + roll image folders).
 * Run before delete_my_account() RPC.
 */
export async function deleteMyAccountStorage(userId) {
  if (!userId) throw new Error('Missing user id');

  const { data: ownedRolls, error: e1 } = await supabase
    .from('rolls')
    .select('id, title_image_url')
    .eq('creator_id', userId);

  if (e1) console.warn('[accountDeletion] rolls query', e1.message);

  const ownedRollIds = new Set((ownedRolls || []).map((r) => r.id));

  const { data: contribRows, error: e2 } = await supabase
    .from('roll_images')
    .select('image_url, roll_id')
    .eq('contributor_id', userId);

  if (e2) console.warn('[accountDeletion] roll_images query', e2.message);

  for (const row of contribRows || []) {
    if (ownedRollIds.has(row.roll_id)) continue;
    const p = pathFromImageUrl(row.image_url, 'roll-images');
    if (p) {
      const { error: rErr } = await supabase.storage.from('roll-images').remove([p]);
      if (rErr) console.warn('[accountDeletion] remove contributor roll image', rErr.message);
    }
  }

  for (const roll of ownedRolls || []) {
    await removeStoragePrefix('roll-images', roll.id);
    await removeStoragePrefix('roll-title-images', roll.id);
    const titlePath = pathFromImageUrl(roll.title_image_url, 'roll-title-images');
    if (titlePath) {
      await supabase.storage.from('roll-title-images').remove([titlePath]);
    }
  }

  await removeStoragePrefix('profile-images', userId);
  await removeStoragePrefix('profile-photos', userId);
}

/**
 * Permanently delete the signed-in account (Storage first, then DB via RPC).
 */
export async function deleteMyAccount() {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user?.id) {
    throw new Error('You must be signed in to delete your account.');
  }

  const userId = user.id;

  await deleteMyAccountStorage(userId);

  const { error: rpcError } = await supabase.rpc('delete_my_account');

  if (rpcError) {
    if (
      rpcError.message?.includes('function') &&
      rpcError.message?.includes('does not exist')
    ) {
      throw new Error(
        'Account deletion is not enabled on the server yet. Run DELETE_ACCOUNT_GDPR.sql in Supabase, then try again.'
      );
    }
    throw rpcError;
  }

  clearProfileCache();
  try {
    await AsyncStorage.multiRemove([
      `@rolls/shipping_address_v1/${userId}`,
      `@rolls/private_location_v1/${userId}`,
      `@rolls/print_orders_v1/${userId}`,
    ]);
  } catch (e) {
    console.warn('[accountDeletion] local preferences cleanup', e?.message || e);
  }
  await supabase.auth.signOut();
}
