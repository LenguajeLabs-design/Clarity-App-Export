import { useState } from "react";
import { useAppData } from "@/lib/useAppData";
import { useSyncStatus } from "@/lib/useSyncStatus";
import { syncItems, syncProjects, verifyMigrationCounts } from "@/lib/supabase-sync";
import { Switch } from "@/components/ui/switch";
import {
  Cloud,
  CloudOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

type MigrationState = 'idle' | 'running' | 'success' | 'error';

function CloudSyncSection() {
  const { items, projects } = useAppData();
  const { status, lastSyncedAt, userId, isSupabaseConfigured, setSynced, setSyncError } = useSyncStatus();
  const [migrationState, setMigrationState] = useState<MigrationState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const isMigrated = Boolean(localStorage.getItem('clarity_migrated'));

  async function runMigration() {
    if (!userId) {
      setErrorMessage('Not connected to Supabase. Please wait a moment and try again.');
      setMigrationState('error');
      return;
    }
    setMigrationState('running');
    setErrorMessage('');
    try {
      localStorage.setItem('clarity_items_backup', JSON.stringify(items));
      localStorage.setItem('clarity_projects_backup', JSON.stringify(projects));

      await syncItems(items, userId, () => {}, () => {}, () => { throw new Error('Items sync failed'); });
      await syncProjects(projects, userId, () => {}, () => {}, () => { throw new Error('Projects sync failed'); });

      const ok = await verifyMigrationCounts(userId, items.length, projects.length);
      if (!ok) throw new Error('Count mismatch — please try again.');

      localStorage.setItem('clarity_migrated', 'true');
      localStorage.removeItem('clarity_migration_dismissed');
      setSynced();
      setMigrationState('success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('[Clarity] Migration failed:', e);
      setErrorMessage(msg);
      setSyncError();
      setMigrationState('error');
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="bg-muted/40 p-5 rounded-2xl border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <CloudOff className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">Cloud sync — not configured</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          Set up Supabase to back up your data and sync across devices.
          Free and takes about 5 minutes.
        </p>
        <a
          href="https://supabase.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Get started at supabase.com
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <p className="text-xs text-muted-foreground mt-3">
          Follow the instructions in <code className="bg-muted px-1 rounded text-xs">supabase/README.md</code> to complete setup.
        </p>
      </div>
    );
  }

  const timeStr = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Cloud className="w-4 h-4 text-primary" />
        <h3 className="text-base font-semibold text-foreground">Cloud sync</h3>
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">Status</span>
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {status === 'local-only' && (
            <><CloudOff className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground">Local only</span></>
          )}
          {status === 'syncing' && (
            <><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /><span className="text-primary">Syncing…</span></>
          )}
          {status === 'synced' && (
            <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /><span className="text-green-700">Synced{timeStr ? ` at ${timeStr}` : ''}</span></>
          )}
          {status === 'error' && (
            <><AlertCircle className="w-3.5 h-3.5 text-destructive" /><span className="text-destructive">Sync error</span></>
          )}
        </span>
      </div>

      {!isMigrated && migrationState !== 'success' && (
        <div className="border-t border-border/50 pt-4">
          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
            Your existing data hasn't been uploaded yet. Migrate to back it all up.
          </p>
          {migrationState === 'error' && (
            <div className="flex items-start gap-2 mb-3 p-2.5 rounded-xl bg-destructive/10">
              <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{errorMessage}</p>
            </div>
          )}
          <button
            onClick={() => void runMigration()}
            disabled={migrationState === 'running'}
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-primary rounded-xl px-4 py-2.5 min-h-[44px] w-full justify-center hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60"
          >
            {migrationState === 'running' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Migrating…</>
            ) : (
              'Migrate my data'
            )}
          </button>
        </div>
      )}

      {(isMigrated || migrationState === 'success') && (
        <div className="border-t border-border/50 pt-4">
          {migrationState === 'success' && (
            <div className="flex items-center gap-2 mb-3 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              Migration complete! All data backed up.
            </div>
          )}
          <button
            onClick={() => void runMigration()}
            disabled={migrationState === 'running'}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors disabled:opacity-40"
          >
            {migrationState === 'running' ? 'Migrating…' : 'Re-run migration'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { settings, updateSettings } = useAppData();
  const { isSupabaseConfigured } = useSyncStatus();

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <h1 className="text-4xl font-display font-bold mb-10 text-foreground">Settings</h1>

      <div className="flex flex-col gap-4 mb-12">
        <div className="flex items-center justify-between bg-card p-6 rounded-2xl border border-border/60 shadow-sm">
          <span className="text-xl font-medium">Bigger text</span>
          <Switch
            checked={settings.largeText}
            onCheckedChange={(v) => updateSettings({ ...settings, largeText: v })}
          />
        </div>
        <div className="flex items-center justify-between bg-card p-6 rounded-2xl border border-border/60 shadow-sm">
          <span className="text-xl font-medium">High contrast</span>
          <Switch
            checked={settings.highContrast}
            onCheckedChange={(v) => updateSettings({ ...settings, highContrast: v })}
          />
        </div>
        <div className="flex items-center justify-between bg-card p-6 rounded-2xl border border-border/60 shadow-sm">
          <span className="text-xl font-medium">Less motion</span>
          <Switch
            checked={settings.reducedMotion}
            onCheckedChange={(v) => updateSettings({ ...settings, reducedMotion: v })}
          />
        </div>
      </div>

      <div className="h-px bg-border/60 w-full mb-8" />

      <div className="mb-8">
        <CloudSyncSection />
      </div>

      <div className="h-px bg-border/60 w-full mb-8" />

      <div className="bg-muted/50 p-6 rounded-2xl border border-border/50 mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">Your data</h3>
        <p className="text-base text-muted-foreground leading-relaxed">
          {isSupabaseConfigured
            ? "Your data is saved locally and optionally backed up to Supabase. No third-party tracking or analytics."
            : "Everything is saved in your browser's local storage — no account, no server, no sync. If you clear your browser data or switch devices, your data will not carry over."}
        </p>
      </div>

      <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10">
        <h3 className="text-2xl font-display font-bold text-primary mb-3">Privacy Promise</h3>
        <p className="text-lg text-foreground/80 leading-relaxed font-medium">
          {isSupabaseConfigured
            ? "Your data only goes to your own Supabase project — fully under your control. Nothing is shared with third parties. This app doesn't track you."
            : "Everything stays on your device. Nothing is sent anywhere. This app doesn't track you."}
        </p>
      </div>
    </div>
  );
}
