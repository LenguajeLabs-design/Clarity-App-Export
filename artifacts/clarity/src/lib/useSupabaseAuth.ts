import { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

export interface SupabaseAuthState {
  userId: string | null;
  isReady: boolean;
}

export function useSupabaseAuth(): SupabaseAuthState {
  const [userId, setUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || attempted.current) return;
    attempted.current = true;

    async function bootstrap() {
      if (!supabase) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
        } else {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) {
            console.error('[Clarity] Anonymous auth failed:', error.message);
          } else if (data.user) {
            setUserId(data.user.id);
          }
        }
      } catch (e) {
        console.error('[Clarity] Auth bootstrap error:', e);
      } finally {
        setIsReady(true);
      }
    }

    void bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { userId, isReady };
}
