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
const LOCKOUT_KEY = 'gtz-admin-lockout-v1';

/** Wrong tries allowed before the form locks, and how long it stays locked. */
export const MAX_ATTEMPTS = 3;
export const LOCKOUT_MS = 3 * 60 * 1000;

// SHA-256 of the built-in password. Storing the digest keeps the fallback
// credential out of the shipped bundle as plain text; set VITE_ADMIN_PASSWORD
// (or, better, VITE_ADMIN_PASSWORD_SHA256) to use your own.
const DEFAULT_PASSWORD_SHA256 = 'baf57b0f52bea0c873d34a01b50c978d8a49a8f43763c81bcd990c53cda7d626';

export function authMode() {
  return supabaseConfigured() ? 'supabase' : 'password';
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function readLockout() {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCKOUT_KEY) || 'null');
    return stored && typeof stored === 'object' ? stored : { fails: 0, until: 0 };
  } catch {
    return { fails: 0, until: 0 };
  }
}

function writeLockout(state) {
  try {
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
  } catch {
    /* private mode: the throttle simply does not persist across reloads */
  }
}

/**
 * How the sign-in form should behave right now.
 *
 * A browser-side throttle cannot stop someone scripting the Supabase endpoint
 * directly - that is what Supabase Auth's own rate limiting and the RLS
 * policies are for. What it does do is stop someone sitting at an unattended
 * machine from guessing the password by hand.
 */
export function lockoutState(now = Date.now()) {
  const { fails = 0, until = 0 } = readLockout();
  const remainingMs = Math.max(0, until - now);
  return {
    locked: remainingMs > 0,
    remainingMs,
    fails,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - fails),
  };
}

/** Records a wrong password and locks the form once the limit is reached. */
export function registerFailedAttempt(now = Date.now()) {
  const { fails = 0 } = readLockout();
  const nextFails = fails + 1;
  const locked = nextFails >= MAX_ATTEMPTS;
  writeLockout({ fails: locked ? 0 : nextFails, until: locked ? now + LOCKOUT_MS : 0 });
  return lockoutState(now);
}

export function clearFailedAttempts() {
  writeLockout({ fails: 0, until: 0 });
}

/**
 * Checks the local password. Resolves to a lockout state so the caller can say
 * how many tries are left, or how long the wait is.
 */
export async function signInLocal(password) {
  const gate = lockoutState();
  if (gate.locked) return { ok: false, ...gate };

  const configured = import.meta.env.VITE_ADMIN_PASSWORD_SHA256?.trim().toLowerCase();
  const plain = import.meta.env.VITE_ADMIN_PASSWORD;
  const expected = configured || (plain ? await sha256Hex(plain) : DEFAULT_PASSWORD_SHA256);

  if ((await sha256Hex(password)) !== expected) {
    return { ok: false, ...registerFailedAttempt() };
  }

  clearFailedAttempts();
  sessionStorage.setItem(LOCAL_SESSION_KEY, '1');
  return { ok: true, ...lockoutState() };
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
