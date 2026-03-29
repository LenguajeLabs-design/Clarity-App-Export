import { useState } from "react";
import { useAppData } from "@/lib/useAppData";
import { useSyncStatus } from "@/lib/useSyncStatus";
import { useGitHubSync } from "@/lib/useGitHubSync";
import { syncItems, syncProjects, verifyMigrationCounts } from "@/lib/supabase-sync";
import { GitHubConfig } from "@/lib/github-sync";
import { Switch } from "@/components/ui/switch";
import {
  Cloud,
  CloudOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Github,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  ShieldAlert,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import type { GitHubSyncData } from "@/lib/github-sync";

// ─── Supabase section (kept for existing users) ───────────────────────────────

type MigrationState = 'idle' | 'running' | 'success' | 'error';

function SupabaseSyncSection() {
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
      setErrorMessage(msg);
      setSyncError();
      setMigrationState('error');
    }
  }

  if (!isSupabaseConfigured) return null;

  const timeStr = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-sm mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Cloud className="w-4 h-4 text-primary" />
        <h3 className="text-base font-semibold text-foreground">Supabase sync</h3>
      </div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">Status</span>
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {status === 'local-only' && <><CloudOff className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground">Local only</span></>}
          {status === 'syncing' && <><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /><span className="text-primary">Syncing…</span></>}
          {status === 'synced' && <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /><span className="text-green-700">Synced{timeStr ? ` at ${timeStr}` : ''}</span></>}
          {status === 'error' && <><AlertCircle className="w-3.5 h-3.5 text-destructive" /><span className="text-destructive">Sync error</span></>}
        </span>
      </div>
      {!isMigrated && migrationState !== 'success' && (
        <div className="border-t border-border/50 pt-4">
          <p className="text-sm text-muted-foreground mb-3">Your existing data hasn't been uploaded yet.</p>
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
            {migrationState === 'running' ? <><Loader2 className="w-4 h-4 animate-spin" /> Migrating…</> : 'Migrate my data'}
          </button>
        </div>
      )}
      {(isMigrated || migrationState === 'success') && (
        <div className="border-t border-border/50 pt-4">
          {migrationState === 'success' && (
            <div className="flex items-center gap-2 mb-3 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4" /> Migration complete! All data backed up.
            </div>
          )}
          <button onClick={() => void runMigration()} disabled={migrationState === 'running'}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors disabled:opacity-40">
            {migrationState === 'running' ? 'Migrating…' : 'Re-run migration'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── GitHub sync section ──────────────────────────────────────────────────────

type SetupState = 'idle' | 'validating' | 'saving' | 'error';

function GitHubSyncSection() {
  const { items, projects, settings, replaceAllData } = useAppData();
  const { config, status, lastSyncedAt, errorMessage, saveConfig, validateConfig, sync } = useGitHubSync();

  // Form state (only shown when not yet connected)
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [setupState, setSetupState] = useState<SetupState>('idle');
  const [setupError, setSetupError] = useState('');

  const timeStr = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  async function handleConnect() {
    const trimmedToken = token.trim();
    const trimmedRepo = repo.trim();
    if (!trimmedToken || !trimmedRepo) {
      setSetupError('Both fields are required.');
      return;
    }
    if (!trimmedRepo.includes('/')) {
      setSetupError('Repository must be in "owner/repo-name" format.');
      return;
    }

    setSetupState('validating');
    setSetupError('');

    const newConfig: GitHubConfig = {
      token: trimmedToken,
      repo: trimmedRepo,
      filePath: 'clarity-data.json',
    };

    try {
      await validateConfig(newConfig);
      saveConfig(newConfig);
      setSetupState('idle');
      setToken('');
      setRepo('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Connection failed';
      setSetupError(msg);
      setSetupState('error');
    }
  }

  async function handleSync() {
    if (status === 'syncing') return;
    const result = await sync(items, projects, settings);
    if (result?.hadRemoteUpdate) {
      replaceAllData(
        result.mergedData.items,
        result.mergedData.projects,
        result.mergedData.settings,
        result.mergedData.syncedAt,
      );
    }
  }

  // ── Connected view ──────────────────────────────────────────────────────────
  if (config) {
    return (
      <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-foreground" />
            <h3 className="text-base font-semibold text-foreground">GitHub sync</h3>
          </div>
          <button
            onClick={() => saveConfig(null)}
            className="text-muted-foreground/60 hover:text-destructive transition-colors p-1 rounded-lg"
            title="Disconnect GitHub"
            aria-label="Disconnect GitHub"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Repo */}
        <p className="text-xs text-muted-foreground mb-4 font-mono truncate">{config.repo} / {config.filePath}</p>

        {/* Status row */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">Status</span>
          <span className="flex items-center gap-1.5 text-sm font-medium">
            {status === 'idle' && <><RefreshCw className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground">Ready</span></>}
            {status === 'syncing' && <><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /><span className="text-primary">Syncing…</span></>}
            {status === 'synced' && <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /><span className="text-green-700">Synced{timeStr ? ` at ${timeStr}` : ''}</span></>}
            {status === 'error' && <><AlertCircle className="w-3.5 h-3.5 text-destructive" /><span className="text-destructive">Error</span></>}
          </span>
        </div>

        {/* Error message */}
        {status === 'error' && errorMessage && (
          <div className="flex items-start gap-2 mb-4 p-2.5 rounded-xl bg-destructive/10">
            <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{errorMessage}</p>
          </div>
        )}

        {/* Sync button */}
        <button
          onClick={() => void handleSync()}
          disabled={status === 'syncing'}
          className="flex items-center gap-2 text-sm font-semibold text-white bg-foreground rounded-xl px-4 py-2.5 min-h-[44px] w-full justify-center hover:bg-foreground/80 active:scale-95 transition-all disabled:opacity-60"
        >
          {status === 'syncing' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Syncing…</>
          ) : (
            <><RefreshCw className="w-4 h-4" /> Sync now</>
          )}
        </button>

        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          Pulls the latest version from GitHub, then pushes your local data.
          Latest write wins. A local backup is kept at <code className="bg-muted px-1 rounded">clarity_github_backup</code>.
        </p>
      </div>
    );
  }

  // ── Setup form ──────────────────────────────────────────────────────────────
  return (
    <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Github className="w-4 h-4 text-foreground" />
        <h3 className="text-base font-semibold text-foreground">GitHub sync</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        Store your data as a JSON file in a private GitHub repo. Free, simple, no backend.
      </p>

      {/* Token field */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-foreground/70 mb-1.5 block">
          Personal Access Token
        </label>
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="github_pat_..."
            className="w-full text-sm bg-muted/50 border border-border/60 rounded-xl px-3 py-2.5 pr-10 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showToken ? 'Hide token' : 'Show token'}
          >
            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <a
          href="https://github.com/settings/personal-access-tokens/new"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1.5 transition-colors"
        >
          Create a fine-grained token <ExternalLink className="w-3 h-3" />
        </a>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Permissions needed: <strong>Contents: Read and write</strong> on your backup repo only.
        </p>
      </div>

      {/* Repo field */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-foreground/70 mb-1.5 block">
          Repository
        </label>
        <input
          type="text"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="your-username/clarity-backup"
          className="w-full text-sm bg-muted/50 border border-border/60 rounded-xl px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="text-xs text-muted-foreground/70 mt-1">
          Must be a private repo you own. Create one at github.com if needed.
        </p>
      </div>

      {/* Error */}
      {setupState === 'error' && setupError && (
        <div className="flex items-start gap-2 mb-3 p-2.5 rounded-xl bg-destructive/10">
          <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{setupError}</p>
        </div>
      )}

      {/* Connect button */}
      <button
        onClick={() => void handleConnect()}
        disabled={setupState === 'validating' || !token.trim() || !repo.trim()}
        className="flex items-center gap-2 text-sm font-semibold text-white bg-foreground rounded-xl px-4 py-2.5 min-h-[44px] w-full justify-center hover:bg-foreground/80 active:scale-95 transition-all disabled:opacity-60"
      >
        {setupState === 'validating' ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</>
        ) : (
          <><Github className="w-4 h-4" /> Connect</>
        )}
      </button>
    </div>
  );
}

// ─── Backup restore section ───────────────────────────────────────────────────

function RestoreBackupSection() {
  const { replaceAllData } = useAppData();
  const [restored, setRestored] = useState(false);
  const [restoredCount, setRestoredCount] = useState<number | null>(null);
  const [showDiag, setShowDiag] = useState(false);

  // Read every relevant key from localStorage
  const diag = (() => {
    const read = (key: string) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch { return null; }
    };
    const backup = read('clarity_github_backup') as GitHubSyncData | null;
    const items = read('clarity_items') as unknown[] | null;
    const projects = read('clarity_projects') as unknown[] | null;
    return {
      backup,
      backupItemCount: Array.isArray(backup?.items) ? backup!.items.filter((i: { isDeleted?: boolean }) => !i.isDeleted).length : 0,
      backupSyncedAt: backup?.syncedAt ?? null,
      currentItemCount: Array.isArray(items) ? items.filter((i: { isDeleted?: boolean }) => !i.isDeleted).length : 0,
      currentProjectCount: Array.isArray(projects) ? projects.filter((p: { isDeleted?: boolean }) => !p.isDeleted).length : 0,
      lastModified: localStorage.getItem('clarity_last_modified'),
    };
  })();

  const hasBackupData = diag.backupItemCount > 0;

  // Only show this section when there's something to report
  if (!diag.backup && diag.currentItemCount > 0) return null;

  function handleRestore() {
    if (!diag.backup) return;
    replaceAllData(diag.backup.items, diag.backup.projects, diag.backup.settings);
    setRestoredCount(diag.backupItemCount);
    setRestored(true);
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-4">
      <div className="flex items-start gap-3 mb-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground mb-1">
            {restored ? 'Data restored' : hasBackupData ? 'Backup found' : 'Data recovery'}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {restored
              ? `Restored ${restoredCount} task${restoredCount !== 1 ? 's' : ''}. Tap Sync to push your data back to GitHub.`
              : hasBackupData
              ? `A backup with ${diag.backupItemCount} task${diag.backupItemCount !== 1 ? 's' : ''} was found from before your last sync.`
              : `Your data appears empty. See the diagnostic below to understand what happened.`}
          </p>
        </div>
      </div>

      {!restored && hasBackupData && (
        <button
          onClick={handleRestore}
          className="flex items-center gap-2 text-sm font-semibold text-white bg-amber-600 rounded-xl px-4 py-2.5 min-h-[44px] w-full justify-center hover:bg-amber-700 active:scale-95 transition-all mb-3"
        >
          <RotateCcw className="w-4 h-4" />
          Restore {diag.backupItemCount} tasks from backup
        </button>
      )}

      {restored && (
        <div className="flex items-center gap-2 text-sm text-amber-700 font-medium mb-3">
          <CheckCircle2 className="w-4 h-4" />
          Restored — sync now to save to GitHub
        </div>
      )}

      {/* Diagnostic toggle */}
      <button
        onClick={() => setShowDiag(v => !v)}
        className="text-xs text-amber-700/70 underline underline-offset-2 mt-1"
      >
        {showDiag ? 'Hide diagnostic' : 'Show storage diagnostic'}
      </button>

      {showDiag && (
        <div className="mt-3 bg-background/60 rounded-xl p-3 text-xs font-mono text-muted-foreground space-y-1">
          <div>clarity_items: <span className="text-foreground">{diag.currentItemCount} active tasks</span></div>
          <div>clarity_projects: <span className="text-foreground">{diag.currentProjectCount} projects</span></div>
          <div>clarity_github_backup: <span className="text-foreground">
            {diag.backup ? `${diag.backupItemCount} tasks (saved ${diag.backupSyncedAt ? new Date(diag.backupSyncedAt).toLocaleString() : 'unknown'})` : 'not found'}
          </span></div>
          <div>clarity_last_modified: <span className="text-foreground">
            {diag.lastModified ? new Date(diag.lastModified).toLocaleString() : 'not set'}
          </span></div>
        </div>
      )}
    </div>
  );
}

// ─── Main Settings page ───────────────────────────────────────────────────────

export default function Settings() {
  const { settings, updateSettings } = useAppData();
  const { isSupabaseConfigured } = useSyncStatus();
  const { config: githubConfig } = useGitHubSync();

  const hasAnySync = isSupabaseConfigured || Boolean(githubConfig);

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <h1 className="text-4xl font-display font-bold mb-10 text-foreground">Settings</h1>

      {/* Appearance — theme toggle */}
      <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm mb-6">
        <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wider mb-4">Appearance</h3>
        <div className="flex gap-3">
          {(
            [
              { value: 'light', label: 'Light',     Icon: Sun     },
              { value: 'auto',  label: 'Automatic', Icon: Monitor },
              { value: 'dark',  label: 'Dark',      Icon: Moon    },
            ] as const
          ).map(({ value, label, Icon }) => {
            const active = (settings.theme ?? 'auto') === value;
            return (
              <button
                key={value}
                onClick={() => updateSettings({ ...settings, theme: value })}
                className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 text-sm font-medium transition-all min-h-[80px] ${
                  active
                    ? 'border-primary/50 bg-primary/5 text-primary'
                    : 'border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Accessibility toggles */}
      <div className="flex flex-col gap-4 mb-12">
        <div className="flex items-center justify-between bg-card p-6 rounded-2xl border border-border/60 shadow-sm">
          <span className="text-xl font-medium">Bigger text</span>
          <Switch checked={settings.largeText} onCheckedChange={(v) => updateSettings({ ...settings, largeText: v })} />
        </div>
        <div className="flex items-center justify-between bg-card p-6 rounded-2xl border border-border/60 shadow-sm">
          <span className="text-xl font-medium">High contrast</span>
          <Switch checked={settings.highContrast} onCheckedChange={(v) => updateSettings({ ...settings, highContrast: v })} />
        </div>
        <div className="flex items-center justify-between bg-card p-6 rounded-2xl border border-border/60 shadow-sm">
          <span className="text-xl font-medium">Less motion</span>
          <Switch checked={settings.reducedMotion} onCheckedChange={(v) => updateSettings({ ...settings, reducedMotion: v })} />
        </div>
      </div>

      <div className="h-px bg-border/60 w-full mb-8" />

      {/* Sync sections */}
      <div className="mb-8 flex flex-col gap-4">
        <GitHubSyncSection />
        <SupabaseSyncSection />
      </div>

      <div className="h-px bg-border/60 w-full mb-8" />

      {/* Backup restore — shown only when a pre-sync backup exists */}
      <RestoreBackupSection />

      {/* Data note */}
      <div className="bg-muted/50 p-6 rounded-2xl border border-border/50 mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">Your data</h3>
        <p className="text-base text-muted-foreground leading-relaxed">
          {hasAnySync
            ? "Your data is saved locally and synced to your own storage. No third-party tracking."
            : "Everything is saved in your browser's local storage — no account, no server, no sync. If you clear your browser data or switch devices, your data will not carry over."}
        </p>
      </div>

      {/* Privacy promise */}
      <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10">
        <h3 className="text-2xl font-display font-bold text-primary mb-3">Privacy Promise</h3>
        <p className="text-lg text-foreground/80 leading-relaxed font-medium">
          {githubConfig
            ? "Your data goes only to your own private GitHub repository — fully under your control. Nothing is shared with third parties. This app doesn't track you."
            : isSupabaseConfigured
            ? "Your data only goes to your own Supabase project — fully under your control. Nothing is shared with third parties. This app doesn't track you."
            : "Everything stays on your device. Nothing is sent anywhere. This app doesn't track you."}
        </p>
      </div>
    </div>
  );
}
