// lib/supabase.ts - Client-side Supabase client for Next.js

import { createBrowserClient } from './supabase/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Make Supabase optional - if env vars are missing, export null
// Components should check if supabase is available before using it
export const supabase = supabaseUrl && supabaseAnonKey
  ? createBrowserClient()
  : null;

// Log warning in development if Supabase is not configured
if (process.env.NODE_ENV === 'development' && !supabase) {
  console.warn(
    'Supabase is not configured. Some features may not work. ' +
    'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file to enable Supabase features.'
  );
}
