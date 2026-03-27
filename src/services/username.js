import { supabase } from '../lib/supabase';

/**
 * @param {string} username - raw username (trimmed by RPC)
 * @param {string|null} excludeUserId - current user id when editing profile
 * @returns {Promise<{ available: boolean, error: Error|null }>}
 */
export async function checkUsernameAvailable(username, excludeUserId = null) {
  const trimmed = (username || '').trim();
  if (!trimmed) {
    return { available: false, error: null };
  }

  const { data, error } = await supabase.rpc('is_username_available', {
    p_username: trimmed,
    p_exclude_user_id: excludeUserId,
  });

  if (error) {
    return { available: false, error: new Error(error.message || 'Username check failed') };
  }

  return { available: data === true, error: null };
}
