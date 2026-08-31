import { createClient } from '@supabase/supabase-js';

let client = null;

export function supabaseConfigured() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function getSupabase() {
  if (!supabaseConfigured()) return null;
  if (!client) {
    client = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
      // The admin signs in with Supabase Auth, so the session has to survive a
      // reload and refresh itself; RLS reads the JWT this client carries.
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}
