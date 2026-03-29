import pkg from '../../package.json';

/** App version from package.json (shown in About Rolls). */
export const APP_VERSION = pkg.version ?? '0.0.0';

/**
 * When you publish policies, set these to full https URLs and the in-app rows will open them.
 * Leave empty to show a short “coming soon” message instead.
 */
export const PRIVACY_POLICY_URL = '';
export const TERMS_OF_USE_URL = '';
