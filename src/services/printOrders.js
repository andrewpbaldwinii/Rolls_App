import AsyncStorage from '@react-native-async-storage/async-storage';

const storageKey = (userId) => `@rolls/print_orders_v1/${userId || 'anon'}`;

/**
 * Print orders for the signed-in seller (orders of your prints from buyers).
 * Shape: { id, status, created_at, buyer_summary?, photo_label?, quantity? }
 * Currently empty until checkout/backoffice is wired; can seed locally for QA.
 */
export async function listPrintOrders(userId) {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Local-only record for QA / until a real checkout API exists.
 * Appears in Profile → Print orders.
 */
export async function recordLocalPrintOrderRequest(userId, payload) {
  if (!userId) return null;
  const orders = await listPrintOrders(userId);
  const row = {
    id: `req_${Date.now()}`,
    status: 'Requested',
    created_at: new Date().toISOString(),
    buyer_summary: payload.buyerSummary || '',
    photo_label: payload.rollTitle || 'Roll print',
    quantity: payload.quantity ?? 0,
  };
  const next = [row, ...orders];
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
  return row;
}
