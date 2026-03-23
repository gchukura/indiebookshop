// lib/supabase.ts — Browser-side Supabase client.
// COMMENTED OUT: Migrating off Supabase. Photos moving to Cloudflare R2;
// form dropdowns now fetch from /api/bookstores/filter (Google Sheets).
// Keep this file until the migration is fully complete and the package can be removed.

// import { createClient } from '@supabase/supabase-js';
//
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
//
// // Make Supabase optional — if env vars are missing, export null.
// // Components that use this should guard with `if (!supabase)`.
// export const supabase =
//   supabaseUrl && supabaseAnonKey
//     ? createClient(supabaseUrl, supabaseAnonKey)
//     : null;
//
// if (process.env.NODE_ENV === 'development' && !supabase) {
//   console.warn(
//     'Supabase is not configured. Submission forms will not work. ' +
//       'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable them.'
//   );
// }

export const supabase = null;
