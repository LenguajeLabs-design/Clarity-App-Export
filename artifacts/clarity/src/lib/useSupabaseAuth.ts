import { useState, useEffect } from 'react';
import { getDeviceId } from './supabase';

export interface SupabaseAuthState {
  userId: string | null;
  isReady: boolean;
}

const SUPABASE_USER_ID_KEY = 'clarity_supabase_user_id';

// Retrieves (or creates) a real Supabase auth user for this device via the
// API server. The server uses the service_role key to call auth.admin.createUser,
// which returns a UUID that satisfies Supabase's FK constraints. The UUID is
// cached in localStorage so we only call the server once per device.
export function useSupabaseAuth(): SupabaseAuthState {
  const [userId, setUserId] = useState<string | null>(() => {
    // Initialise synchronously from cache if available
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem(SUPABASE_USER_ID_KEY)
      : null;
  });
  const [isReady, setIsReady] = useState(() => {
    return typeof localStorage !== 'undefined'
      ? Boolean(localStorage.getItem(SUPABASE_USER_ID_KEY))
      : false;
  });

  useEffect(() => {
    // Already have a cached userId — no need to call the server
    if (userId) return;

    const deviceId = getDeviceId();

    async function bootstrap() {
      try {
        const res = await fetch('/api/clarity/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          console.error('[Clarity] Auth failed:', body.error ?? `HTTP ${res.status}`);
          return;
        }

        const { userId: newUserId } = await res.json() as { userId: string };
        if (newUserId) {
          localStorage.setItem(SUPABASE_USER_ID_KEY, newUserId);
          setUserId(newUserId);
        }
      } catch (e) {
        console.error('[Clarity] Auth bootstrap error:', e);
      } finally {
        setIsReady(true);
      }
    }

    void bootstrap();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { userId, isReady };
}
