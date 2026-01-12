import { createClient } from '@supabase/supabase-js';

// React Native polyfill for URL protocol property issue
import 'react-native-url-polyfill/auto';

// Supabase configuration
const supabaseUrl = 'https://wdduwfzzwwmwxgttilga.supabase.co';
const supabaseAnonKey = 'sb_publishable_xmgbCz7CHkxdE7lnntkygw_gj6vis9H';

// Create Supabase client with React Native-specific options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: require('@react-native-async-storage/async-storage').default,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

