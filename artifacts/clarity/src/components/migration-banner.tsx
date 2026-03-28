import { useState, useEffect } from 'react';
import { CloudUpload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAppData } from '@/lib/useAppData';
import { useSyncStatus } from '@/lib/useSyncStatus';
import { syncItems, syncProjects, verifyMigrationCounts } from '@/lib/supabase-sync';

type MigrationState = 'idle' | 'running' | 'success' | 'error';

export function MigrationBanner() {
  const { items, projects } = useAppData();
  const { isSupabaseConfigured, userId, setSynced, setSyncError } = useSyncStatus();
  const [visible, setVisible] = useState(false);
  const [migrationState, setMigrationState] = useState<MigrationState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const migrated = localStorage.getItem('clarity_migrated');
    const dismissed = localStorage.getItem('clarity_migration_dismissed');
    const hasData = items.length > 0 || projects.length > 0;
    if (!migrated && !dismissed && hasData) {
      setVisible(true);
    }
  }, [isSupabaseConfigured, items.length, projects.length]);

  if (!visible) return null;

  const activeItems = items.filter((i) => !i.isDeleted);
  const inboxCount = activeItems.filter((i) => !i.isTriaged).length;
  const taskCount = activeItems.filter((i) => i.isTriaged && i.type === 'task').length;
  const noteCount = activeItems.filter((i) => i.type === 'note').length;
  const projectCount = projects.length;

  function dismiss() {
    localStorage.setItem('clarity_migration_dismissed', 'true');
    setVisible(false);
  }

  async function runMigration() {
    if (!userId) {
      setErrorMessage('Not connected to Supabase yet. Please wait a moment and try again.');
      setMigrationState('error');
      return;
    }

    setMigrationState('running');
    setErrorMessage('');

    try {
      localStorage.setItem('clarity_items_backup', JSON.stringify(items));
      localStorage.setItem('clarity_projects_backup', JSON.stringify(projects));

      await syncItems(
        items,
        userId,
        () => {},
        () => {},
        () => { throw new Error('Items sync failed'); },
      );

      await syncProjects(
        projects,
        userId,
        () => {},
        () => {},
        () => { throw new Error('Projects sync failed'); },
      );

      const ok = await verifyMigrationCounts(userId, items.length, projects.length);
      if (!ok) {
        throw new Error('Count mismatch after upload — please try again.');
      }

      localStorage.setItem('clarity_migrated', 'true');
      localStorage.removeItem('clarity_migration_dismissed');
      setSynced();
      setMigrationState('success');

      setTimeout(() => setVisible(false), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('[Clarity] Migration failed:', e);
      setErrorMessage(msg);
      setSyncError();
      setMigrationState('error');
    }
  }

  return (
    <div className="mx-4 mt-4 rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {migrationState === 'success' ? (
        <div className="flex items-center gap-3 p-4">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-foreground">
            All your data is now backed up to the cloud.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 p-4">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CloudUpload className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground mb-1">
                Back up your data to the cloud
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {inboxCount > 0 && <span>{inboxCount} inbox item{inboxCount !== 1 ? 's' : ''}</span>}
                {inboxCount > 0 && taskCount > 0 && ', '}
                {taskCount > 0 && <span>{taskCount} task{taskCount !== 1 ? 's' : ''}</span>}
                {(inboxCount > 0 || taskCount > 0) && noteCount > 0 && ', '}
                {noteCount > 0 && <span>{noteCount} note{noteCount !== 1 ? 's' : ''}</span>}
                {(inboxCount > 0 || taskCount > 0 || noteCount > 0) && projectCount > 0 && ', '}
                {projectCount > 0 && <span>{projectCount} project{projectCount !== 1 ? 's' : ''}</span>}
                {' '}ready to copy. Your original data stays on this device.
              </p>

              {migrationState === 'error' && (
                <div className="flex items-start gap-2 mt-2 p-2 rounded-xl bg-destructive/10">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{errorMessage || 'Migration failed. Please try again.'}</p>
                </div>
              )}

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => void runMigration()}
                  disabled={migrationState === 'running'}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary rounded-xl px-3 py-2 min-h-[36px] hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60"
                >
                  {migrationState === 'running' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Migrating…
                    </>
                  ) : (
                    'Migrate my data'
                  )}
                </button>
                <button
                  onClick={dismiss}
                  disabled={migrationState === 'running'}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors py-2 px-2 min-h-[36px] disabled:opacity-40"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              onClick={dismiss}
              disabled={migrationState === 'running'}
              className="text-muted-foreground/60 hover:text-muted-foreground transition-colors p-1 -mt-0.5 -mr-0.5 disabled:opacity-40"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
