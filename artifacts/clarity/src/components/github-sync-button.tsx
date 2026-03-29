/**
 * GitHubSyncButton — the small sync button shown in the app header.
 *
 * It lives inside AppDataProvider (so it can read items/projects/settings)
 * and consumes GitHubSyncContext to fire the actual sync.
 *
 * After a successful sync where remote was newer, it calls replaceAllData()
 * to update local state without touching any other mutation paths.
 */

import { useAppData } from '@/lib/useAppData';
import { useGitHubSync } from '@/lib/useGitHubSync';
import { RefreshCw, CheckCircle2, AlertCircle, CloudOff } from 'lucide-react';

export function GitHubSyncButton() {
  const { items, projects, settings, replaceAllData } = useAppData();
  const { config, status, lastSyncedAt, errorMessage, sync } = useGitHubSync();

  if (!config) return null; // hidden when GitHub not configured

  const timeStr = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  async function handleSync() {
    if (status === 'syncing') return;
    const result = await sync(items, projects, settings);
    if (result?.hadRemoteUpdate) {
      // Remote was newer — replace local state and record when that data
      // was last modified so future sync comparisons remain valid.
      replaceAllData(
        result.mergedData.items,
        result.mergedData.projects,
        result.mergedData.settings,
        result.mergedData.syncedAt,
      );
    }
  }

  return (
    <button
      onClick={() => void handleSync()}
      disabled={status === 'syncing'}
      title={
        status === 'error'
          ? `Sync error: ${errorMessage}`
          : status === 'synced' && timeStr
          ? `Last synced at ${timeStr}`
          : 'Sync with GitHub'
      }
      className="flex items-center gap-1 text-xs transition-colors py-1.5 px-2 rounded-xl hover:bg-muted active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
      aria-label="Sync with GitHub"
    >
      {status === 'syncing' && (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
          <span className="text-primary">Syncing…</span>
        </>
      )}
      {status === 'synced' && (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          <span className="text-muted-foreground">Synced</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-destructive">Sync error</span>
        </>
      )}
      {status === 'idle' && (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Sync</span>
        </>
      )}
    </button>
  );
}

/** Small status-only badge — used when Supabase is configured but not GitHub */
export function LocalOnlyBadge() {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground/50">
      <CloudOff className="w-3 h-3" />
      Local only
    </span>
  );
}
