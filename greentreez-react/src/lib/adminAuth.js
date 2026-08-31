import { getSupabase, supabaseConfigured } from './catalog/supabase.js';

/**
 * Admin sign-in.
 *
 * With Supabase configured, the gate is a real Supabase Auth session plus a row
 * in public.admins, which is also what the row-level security policies check —
 * so the UI and the database agree on who may write. Without Supabase the app
 * runs entirely in the browser with nothing worth protecting, and a local
 * password keeps development convenient.
 */

const LOCAL_SESSION_KEY = 'gtz-admin-session';

export function authMode() {
  return supabaseConfigured() ? 'supabase' : 'password';
}

export function localPassword() {
  return import.meta.env.VITE_ADMIN_PASSWORD || 'greentreez';
}

export function signInLocal(password) {
  if (password !== localPassword()) return false;
  sessionStorage.setItem(LOCAL_SESSION_KEY, '1');
  return true;
}

export function hasLocalSession() {
  return sessionStorage.getItem(LOCAL_SESSION_KEY) === '1';
}

export function signOutLocal() {
  sessionStorage.removeItem(LOCAL_SESSION_KEY);
}

/** True when the signed-in user is listed in public.admins. */
export async function checkIsAdmin() {
  if (!supabaseConfigured()) return false;
  const { data, error } = await getSupabase().rpc('is_admin');
  if (error) {
    console.warn('[admin] is_admin check failed', error);
    return false;
  }
  return data === true;
}

export async function getSession() {
  if (!supabaseConfigured()) return null;
  const { data } = await getSupabase().auth.getSession();
  return data?.session || null;
}

export async function signIn(email, password) {
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  if (!supabaseConfigured()) {
    signOutLocal();
    return;
  }
  await getSupabase().auth.signOut();
  signOutLocal();
}

export async function sendPasswordReset(email) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/admin`,
  });
  if (error) throw error;
}

export function onAuthChange(listener) {
  if (!supabaseConfigured()) return () => {};
  const { data } = getSupabase().auth.onAuthStateChange((event, session) => listener(event, session));
  return () => data?.subscription?.unsubscribe?.();
}
