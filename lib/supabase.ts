// lib/supabase.ts — Browser-side Supabase client used by the submission forms.
// Only needs the public anon key; no service-role key is involved here.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Make Supabase optional — if env vars are missing, export null.
// Components that use this should guard with `if (!supabase)`.
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

if (process.env.NODE_ENV === 'development' && !supabase) {
  console.warn(
    'Supabase is not configured. Submission forms will not work. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable them.'
  );
}
