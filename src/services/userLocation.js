import AsyncStorage from '@react-native-async-storage/async-storage';

const storageKey = (userId) => `@rolls/private_location_v1/${userId || 'anon'}`;

/**
 * At least a city or a more specific line is required.
 * Data is stored only on this device (AsyncStorage), not on your public profile.
 */
export function validateUserLocation(a) {
  const city = (a.city || '').trim();
  const exactLocation = (a.exactLocation || '').trim();

  if (city.length >= 2) {
    return { ok: true };
  }
  if (exactLocation.length >= 3) {
    return { ok: true };
  }
  return {
    ok: false,
    message: 'Enter at least a city, or a more specific private location (3+ characters).',
  };
}

export async function loadUserLocation(userId) {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !parsed) return null;
    return {
      city: parsed.city || '',
      exactLocation: parsed.exactLocation || '',
    };
  } catch {
    return null;
  }
}

export async function saveUserLocation(userId, payload) {
  if (!userId) throw new Error('Not signed in');
  const v = validateUserLocation(payload);
  if (!v.ok) {
    const err = new Error(v.message);
    throw err;
  }
  const stored = {
    city: (payload.city || '').trim(),
    exactLocation: (payload.exactLocation || '').trim(),
  };
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(stored));
  return stored;
}
