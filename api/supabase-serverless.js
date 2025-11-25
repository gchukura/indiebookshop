// Serverless Supabase client for saving submissions
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    'Serverless: Supabase environment variables are missing. SUBMISSIONS WILL NOT BE SAVED. ' +
    'Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Vercel.'
  );
}

// Use service role key for server-side operations (bypasses RLS)
export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

