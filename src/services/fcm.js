import { Platform, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { supabase } from '../lib/supabase';

/**
 * Android 13+: runtime POST_NOTIFICATIONS (manifest alone is not enough).
 */
export async function ensureAndroidPostNotificationsPermission() {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return true;
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Registers with FCM and stores token in Supabase for the signed-in user.
 * @returns {Promise<string|null>} FCM token or null
 */
export async function registerAndSyncFcmToken(userId) {
  if (!userId) {
    return null;
  }

  await ensureAndroidPostNotificationsPermission();

  // iOS permission flow (no-op on Android for typical builds)
  await messaging().requestPermission();

  const token = await messaging().getToken();
  if (!token) {
    console.warn('[FCM] No registration token');
    return null;
  }

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const { error } = await supabase.from('user_fcm_tokens').upsert(
    {
      user_id: userId,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' },
  );

  if (error) {
    console.warn('[FCM] Supabase upsert failed — did you run CREATE_USER_FCM_TOKENS.sql?', error.message);
    return token;
  }

  return token;
}

/**
 * @param {string} userId
 * @returns {() => void} unsubscribe
 */
export function subscribeToFcmTokenRefresh(userId) {
  return messaging().onTokenRefresh(async (newToken) => {
    if (!userId || !newToken) {
      return;
    }
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    const { error } = await supabase.from('user_fcm_tokens').upsert(
      {
        user_id: userId,
        token: newToken,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' },
    );
    if (error) {
      console.warn('[FCM] token refresh upsert failed', error.message);
    }
  });
}

/**
 * Remove all stored tokens for user (call on sign-out).
 */
export async function deleteAllFcmTokensForUser(userId) {
  if (!userId) {
    return;
  }
  const { error } = await supabase.from('user_fcm_tokens').delete().eq('user_id', userId);
  if (error) {
    console.warn('[FCM] delete tokens failed', error.message);
  }
}
