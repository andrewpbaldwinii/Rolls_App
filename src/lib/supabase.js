import { createClient } from '@supabase/supabase-js';

// React Native polyfill for URL protocol property issue
import 'react-native-url-polyfill/auto';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@env';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_ANON_KEY. Copy .env.example to .env and add your Supabase project values.',
  );
}

/** Hostname from project URL — used to validate password-reset verify links. */
export const supabaseProjectHostname = new URL(SUPABASE_URL).hostname;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: require('@react-native-async-storage/async-storage').default,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
