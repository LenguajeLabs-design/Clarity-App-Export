/**
 * useGitHubSync — React context that manages GitHub sync state.
 *
 * Architecture note:
 *   GitHubSyncProvider sits OUTSIDE AppDataProvider so it can be consumed
 *   by both the header button and the settings page independently.
 *   The actual sync() call is triggered by GitHubSyncButton (inside
 *   AppDataProvider), which passes current items/projects/settings as arguments
 *   and handles replaceAllData() if remote was newer.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import {
  GitHubConfig,
  GitHubSyncData,
  SyncResult,
  loadGitHubConfig,
  persistGitHubConfig,
  syncWithGitHub,
  validateGitHubConfig,
} from './github-sync';
import type { CapturedItem, Project, UserSettings } from './types';

export type GitHubSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface GitHubSyncContextValue {
  config: GitHubConfig | null;
  status: GitHubSyncStatus;
  lastSyncedAt: Date | null;
  errorMessage: string;
  /** Save (or clear) the GitHub config in localStorage */
  saveConfig: (config: GitHubConfig | null) => void;
  /** Validate token + repo without syncing */
  validateConfig: (config: GitHubConfig) => Promise<string>;
  /** Run a full pull → push sync cycle. Returns merged data. */
  sync: (
    items: CapturedItem[],
    projects: Project[],
    settings: UserSettings,
  ) => Promise<SyncResult | null>;
}

const GitHubSyncContext = createContext<GitHubSyncContextValue | null>(null);

export function GitHubSyncProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<GitHubConfig | null>(() => loadGitHubConfig());
  const [status, setStatus] = useState<GitHubSyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const saveConfig = useCallback((newConfig: GitHubConfig | null) => {
    persistGitHubConfig(newConfig);
    setConfigState(newConfig);
    setStatus('idle');
    setErrorMessage('');
  }, []);

  const validateConfig = useCallback(async (cfg: GitHubConfig): Promise<string> => {
    return validateGitHubConfig(cfg);
  }, []);

  const sync = useCallback(async (
    items: CapturedItem[],
    projects: Project[],
    settings: UserSettings,
  ): Promise<SyncResult | null> => {
    if (!config) return null;

    setStatus('syncing');
    setErrorMessage('');

    // syncedAt must represent WHEN THIS DATA WAS LAST MODIFIED, not when
    // the sync is running. A fresh device with no data uses epoch 0 so
    // the remote (which has real data) always wins on first connect.
    const stored = localStorage.getItem('clarity_last_modified');
    let syncedAt: string;
    if (stored) {
      syncedAt = stored;
    } else {
      // Pre-fix device: fall back to most recent item/project createdAt.
      // A device with zero data gets epoch 0, so remote always wins.
      const dates = [
        ...items.map(i => i.createdAt),
        ...projects.map(p => p.createdAt),
      ].filter(Boolean).sort();
      syncedAt = dates[dates.length - 1] ?? new Date(0).toISOString();
    }

    const localData: GitHubSyncData = {
      version: 1,
      syncedAt,
      items,
      projects,
      settings,
    };

    try {
      const result = await syncWithGitHub(config, localData);
      setStatus('synced');
      setLastSyncedAt(new Date());
      return result;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('[Clarity] GitHub sync error:', e);
      setStatus('error');
      setErrorMessage(msg);
      return null;
    }
  }, [config]);

  return (
    <GitHubSyncContext.Provider
      value={{ config, status, lastSyncedAt, errorMessage, saveConfig, validateConfig, sync }}
    >
      {children}
    </GitHubSyncContext.Provider>
  );
}

export function useGitHubSync(): GitHubSyncContextValue {
  const ctx = useContext(GitHubSyncContext);
  if (!ctx) throw new Error('useGitHubSync must be used within GitHubSyncProvider');
  return ctx;
}
