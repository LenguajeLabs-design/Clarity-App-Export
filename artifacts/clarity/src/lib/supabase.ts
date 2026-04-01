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
