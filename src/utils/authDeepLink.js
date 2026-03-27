/**
 * Supabase auth redirects often put tokens in the URL fragment:
 * rollsapp://reset-password#access_token=...&refresh_token=...&type=recovery
 * Some flows use query params instead.
 */

function parseParamString(paramString) {
  const out = {};
  if (!paramString) return out;
  paramString.split('&').forEach((pair) => {
    const i = pair.indexOf('=');
    if (i === -1) return;
    const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' '));
    const v = decodeURIComponent((pair.slice(i + 1) || '').replace(/\+/g, ' '));
    out[k] = v;
  });
  return out;
}

/**
 * @param {string} url
 * @returns {{ access_token: string, refresh_token: string, type?: string } | null}
 */
export function parseSupabaseAuthTokensFromUrl(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    const hashIndex = url.indexOf('#');
    const fragment = hashIndex >= 0 ? url.slice(hashIndex + 1) : '';
    const fromHash = parseParamString(fragment);

    const qStart = url.indexOf('?');
    let queryPart = '';
    if (qStart >= 0) {
      const afterQ = url.slice(qStart + 1);
      queryPart = hashIndex > qStart ? afterQ.split('#')[0] : afterQ;
    }
    const fromQuery = parseParamString(queryPart);
    const params = { ...fromQuery, ...fromHash };

    if (params.access_token && params.refresh_token) {
      return {
        access_token: params.access_token,
        refresh_token: params.refresh_token,
        type: params.type || null,
      };
    }
  } catch (e) {
    console.warn('parseSupabaseAuthTokensFromUrl', e);
  }
  return null;
}

/**
 * PKCE / email link may use ?code= only
 */
export function parseSupabaseAuthCodeFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/[?&#]code=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function isPasswordResetDeepLink(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('reset-password') ||
    lower.includes('type=recovery') ||
    (lower.includes('access_token=') && lower.includes('type=recovery'))
  );
}

/**
 * Password-reset emails use GET .../auth/v1/verify?token=...&type=recovery&redirect_to=...
 * Android/iOS may open that URL in the app (e.g. app link) before any access_token exists.
 * Exchange it with verifyOtp({ token_hash, type: 'recovery' }).
 *
 * @param {string} url
 * @param {string | null} expectedHostname - from SUPABASE_URL; rejects other hosts if set
 * @returns {{ token_hash: string, type: 'recovery' } | null}
 */
export function parseSupabaseRecoveryVerifyFromUrl(url, expectedHostname) {
  if (!url || typeof url !== 'string') return null;
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (!u.pathname.includes('/auth/v1/verify')) return null;
  const type = u.searchParams.get('type');
  const token_hash =
    u.searchParams.get('token_hash') || u.searchParams.get('token');
  if (type !== 'recovery' || !token_hash) return null;
  if (expectedHostname && u.hostname !== expectedHostname) return null;
  return { token_hash, type: 'recovery' };
}
