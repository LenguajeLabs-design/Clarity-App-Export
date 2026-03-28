import { createContext, useContext, useState, useCallback } from 'react';
import { useSupabaseAuth } from './useSupabaseAuth';
import { isSupabaseConfigured } from './supabase';

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

  const { userId } = useSupabaseAuth();

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
