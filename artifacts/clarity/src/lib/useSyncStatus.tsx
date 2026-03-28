import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

export type SyncStatus = 'local-only' | 'syncing' | 'synced' | 'error';

interface SyncStatusContextValue {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  userId: string | null;
  isSupabaseConfigured: boolean;
  setSyncing: () => void;
  setSynced: () => void;
  setSyncError: () => void;
}

const SyncStatusContext = createContext<SyncStatusContextValue | null>(null);

export function SyncStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>('local-only');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const authAttempted = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || authAttempted.current) return;
    authAttempted.current = true;

    async function initAuth() {
      if (!supabase) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
          const migrated = localStorage.getItem('clarity_migrated');
          if (migrated) setStatus('synced');
        } else {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) {
            console.error('[Clarity] Supabase anonymous auth failed:', error.message);
            return;
          }
          if (data.user) {
            setUserId(data.user.id);
          }
        }
      } catch (e) {
        console.error('[Clarity] Supabase auth error:', e);
      }
    }

    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const setSyncing = useCallback(() => setStatus('syncing'), []);
  const setSynced = useCallback(() => {
    setStatus('synced');
    setLastSyncedAt(new Date());
  }, []);
  const setSyncError = useCallback(() => setStatus('error'), []);

  return (
    <SyncStatusContext.Provider
      value={{ status, lastSyncedAt, userId, isSupabaseConfigured, setSyncing, setSynced, setSyncError }}
    >
      {children}
    </SyncStatusContext.Provider>
  );
}

export function useSyncStatus(): SyncStatusContextValue {
  const ctx = useContext(SyncStatusContext);
  if (!ctx) throw new Error('useSyncStatus must be used within SyncStatusProvider');
  return ctx;
}
