import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Guard: only treat Supabase as configured when the URL is actually a valid HTTP/HTTPS URL.
// If someone pastes an API key into the URL field the app would crash without this check.
function isValidHttpUrl(s: string | undefined): boolean {
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(isValidHttpUrl(supabaseUrl) && supabaseAnonKey);

// If the anon key changed since the last session was created, the cached session
// token will be rejected by PostgREST with "Invalid API key". Clear it so the
// app signs in fresh with the current key.
const KEY_FINGERPRINT_STORAGE = 'clarity_supabase_key_fp';
if (isSupabaseConfigured && typeof localStorage !== 'undefined') {
  const fingerprint = supabaseAnonKey!.slice(0, 24);
  const stored = localStorage.getItem(KEY_FINGERPRINT_STORAGE);
  if (stored !== null && stored !== fingerprint) {
    localStorage.removeItem('clarity_supabase_auth');
  }
  localStorage.setItem(KEY_FINGERPRINT_STORAGE, fingerprint);
}

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!_client) {
    _client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'clarity_supabase_auth',
      },
    });
  }
  return _client;
}

export const supabase = getSupabaseClient();
