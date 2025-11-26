// client/src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Make Supabase optional - if env vars are missing, export null
// Components should check if supabase is available before using it
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Log warning in development if Supabase is not configured
if (import.meta.env.DEV && !supabase) {
  console.warn(
    'Supabase is not configured. Some features may not work. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file to enable Supabase features.'
  );
}

