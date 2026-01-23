import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client for server-side use (Server Components, Server Actions, Route Handlers)
 *
 * IMPORTANT: This uses the service role key which bypasses RLS (Row Level Security).
 * Only use this in server-side code where you control the queries.
 */
export function createServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false, // Server-side doesn't need session persistence
      autoRefreshToken: false,
    },
  });
}
