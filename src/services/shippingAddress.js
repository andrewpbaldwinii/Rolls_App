import AsyncStorage from '@react-native-async-storage/async-storage';

const storageKey = (userId) => `@rolls/shipping_address_v1/${userId || 'anon'}`;

/**
 * Basic validation for a shipping address form (international-friendly).
 * Returns { ok: true } or { ok: false, field, message }.
 */
export function validateShippingAddress(a) {
  const fullName = (a.fullName || '').trim();
  if (!fullName || fullName.length < 2) {
    return { ok: false, field: 'fullName', message: 'Enter a valid full name.' };
  }
  const line1 = (a.line1 || '').trim();
  if (!line1 || line1.length < 3) {
    return { ok: false, field: 'line1', message: 'Enter a street address.' };
  }
  const city = (a.city || '').trim();
  if (!city || city.length < 2) {
    return { ok: false, field: 'city', message: 'Enter a city.' };
  }
  const stateRegion = (a.stateRegion || '').trim();
  if (!stateRegion || stateRegion.length < 2) {
    return {
      ok: false,
      field: 'stateRegion',
      message: 'Enter a state, province, or region.',
    };
  }
  const postalCode = (a.postalCode || '').trim();
  if (!postalCode || postalCode.length < 3) {
    return { ok: false, field: 'postalCode', message: 'Enter a postal or ZIP code.' };
  }
  const country = (a.country || '').trim();
  if (!country || country.length < 2) {
    return { ok: false, field: 'country', message: 'Enter a country.' };
  }
  return { ok: true };
}

export async function loadShippingAddress(userId) {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !parsed) return null;
    return {
      fullName: parsed.fullName || '',
      line1: parsed.line1 || '',
      line2: parsed.line2 || '',
      city: parsed.city || '',
      stateRegion: parsed.stateRegion || '',
      postalCode: parsed.postalCode || '',
      country: parsed.country || '',
    };
  } catch {
    return null;
  }
}

export async function saveShippingAddress(userId, address) {
  if (!userId) throw new Error('Not signed in');
  const v = validateShippingAddress(address);
  if (!v.ok) {
    const err = new Error(v.message);
    err.field = v.field;
    throw err;
  }
  const payload = {
    fullName: address.fullName.trim(),
    line1: address.line1.trim(),
    line2: (address.line2 || '').trim(),
    city: address.city.trim(),
    stateRegion: address.stateRegion.trim(),
    postalCode: address.postalCode.trim(),
    country: address.country.trim(),
  };
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(payload));
  return payload;
}
