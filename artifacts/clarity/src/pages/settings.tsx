import { useState, useRef, useEffect } from "react";
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
  Upload,
  Smartphone,
  Link2,
  Copy,
  Check,
} from "lucide-react";
import type { GitHubSyncData } from "@/lib/github-sync";

// ─── Cross-device sync section ────────────────────────────────────────────────

const SUPABASE_USER_ID_KEY = 'clarity_supabase_user_id';

function CrossDeviceSyncSection() {
  const { userId, isSupabaseConfigured } = useSyncStatus();
  const { replaceAllData, settings } = useAppData();

  // Generate-code side
  const [genState, setGenState] = useState<'idle' | 'loading' | 'showing'>('idle');
  const [code, setCode] = useState('');
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [copied, setCopied] = useState(false);

  // Redeem-code side
  const [linkInput, setLinkInput] = useState('');
  const [linkState, setLinkState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    if (!codeExpiry) return;
    const tick = () => {
      const s = Math.max(0, Math.round((codeExpiry.getTime() - Date.now()) / 1000));
      setSecondsLeft(s);
      if (s === 0) { setGenState('idle'); setCode(''); setCodeExpiry(null); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [codeExpiry]);

  if (!isSupabaseConfigured) return null;

  async function handleGenerate() {
    if (!userId) return;
    setGenState('loading');
    try {
      const res = await fetch('/api/clarity/link/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json() as { code?: string; expiresAt?: string; error?: string };
      if (!res.ok) throw new Error(data.error);
      setCode(data.code!);
      setCodeExpiry(new Date(data.expiresAt!));
      setGenState('showing');
    } catch {
      setGenState('idle');
    }
  }

  function handleCopy() {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRedeem() {
    const trimmed = linkInput.trim().toUpperCase();
    if (!trimmed) return;
    setLinkState('loading');
    setLinkError('');
    try {
      const res = await fetch('/api/clarity/link/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json() as {
        userId?: string;
        items?: Record<string, unknown>[];
        projects?: Record<string, unknown>[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? 'Invalid or expired code');

      const mappedItems = (data.items ?? []).map(i => ({
        id: i['id'] as string,
        text: i['text'] as string,
        type: i['type'] as string | null,
        area: i['area'] as string | null,
        timing: i['timing'] as string | null,
        isTriaged: Boolean(i['is_triaged']),
        isDeleted: Boolean(i['is_deleted']),
        isPriority: Boolean(i['is_priority']),
        isQuickWin: Boolean(i['is_quick_win']),
        isCompleted: Boolean(i['is_completed']),
        scheduledDate: (i['scheduled_date'] as string | null) ?? null,
        projectId: (i['project_id'] as string | null) ?? null,
        nextAction: (i['next_action'] as string | null) ?? null,
        waitingOn: (i['waiting_on'] as string | null) ?? null,
        createdAt: i['created_at'] as string,
        completedAt: (i['completed_at'] as string | null) ?? null,
      }));

      const mappedProjects = (data.projects ?? []).map(p => ({
        id: p['id'] as string,
        title: p['title'] as string,
        area: (p['area'] as string | null) ?? null,
        dueDate: (p['due_date'] as string | null) ?? null,
        nextAction: (p['next_action'] as string | null) ?? null,
        status: (p['status'] as string) ?? 'active',
        createdAt: p['created_at'] as string,
      }));

      localStorage.setItem(SUPABASE_USER_ID_KEY, data.userId!);
      replaceAllData(mappedItems as never, mappedProjects as never, settings);
      setLinkState('success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : 'Something went wrong');
      setLinkState('error');
    }
  }

  const mins = Math.ceil(secondsLeft / 60);

  return (
    <div className="bg-card p-5 rounded-2xl border border-primary/20 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Smartphone className="w-4 h-4 text-primary" />
        <h3 className="text-base font-semibold text-foreground">Sync to another device</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Link your phone and PC so they always share the same tasks.
      </p>

      {/* ── Step 1: generate a code on this device ── */}
      <div className="mb-5 pb-5 border-b border-border/50">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Step 1 — On this device, get a code
        </p>
        {genState === 'idle' && (
          <button
            onClick={() => void handleGenerate()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:opacity-80 transition-opacity"
          >
            <Link2 className="w-4 h-4" />
            Get a link code
          </button>
        )}
        {genState === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Generating…
          </div>
        )}
        {genState === 'showing' && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-4xl font-bold tracking-[0.3em] text-foreground select-all">
                {code}
              </span>
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                title="Copy code"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Expires in {secondsLeft < 60 ? `${secondsLeft}s` : `${mins}m`} · One-time use
            </p>
          </div>
        )}
      </div>

      {/* ── Step 2: enter the code on the other device ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Step 2 — On your other device, enter the code
        </p>
        {linkState === 'success' ? (
          <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Linked! Reloading your data…
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={linkInput}
              onChange={e => setLinkInput(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') void handleRedeem(); }}
              maxLength={6}
              placeholder="ABC123"
              className="flex-1 font-mono uppercase tracking-widest text-center text-lg px-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={() => void handleRedeem()}
              disabled={linkState === 'loading' || linkInput.trim().length < 6}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:opacity-80 disabled:opacity-50 transition-opacity"
            >
              {linkState === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Link'}
            </button>
          </div>
        )}
        {linkState === 'error' && (
          <p className="text-sm text-destructive mt-2 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {linkError}
          </p>
        )}
      </div>
    </div>
  );
}

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

// ─── Import data section ──────────────────────────────────────────────────────

function ImportDataSection() {
  const { replaceAllData } = useAppData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  function processFile(file: File) {
    if (!file.name.endsWith('.json')) {
      setState('error');
      setMessage('Please choose a .json file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);

        let items, projects, settings;

        // Helper: a value may itself be a JSON string (localStorage dump style)
        const parseVal = (v: unknown) => {
          if (v === undefined || v === null) return null;
          if (typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } }
          return v;
        };

        if (Array.isArray(parsed)) {
          // Raw items array
          items = parsed;
          projects = [];
          settings = { largeText: false, highContrast: false, reducedMotion: false };
        } else if (parsed.items && Array.isArray(parsed.items)) {
          // Clarity GitHub sync format: { items, projects, settings, syncedAt }
          items = parsed.items;
          projects = Array.isArray(parsed.projects) ? parsed.projects : [];
          settings = parsed.settings ?? { largeText: false, highContrast: false, reducedMotion: false };
        } else if (parsed.clarity_items !== undefined || parsed.clarity_projects !== undefined) {
          // localStorage dump format: { clarity_items: "[...]", clarity_projects: "[...]", clarity_settings: "{...}", ... }
          items = parseVal(parsed.clarity_items) ?? [];
          projects = parseVal(parsed.clarity_projects) ?? [];
          settings = parseVal(parsed.clarity_settings) ?? { largeText: false, highContrast: false, reducedMotion: false };
          if (!Array.isArray(items)) items = [];
          if (!Array.isArray(projects)) projects = [];
        } else {
          throw new Error('Unrecognized format — expected a Clarity export, localStorage dump, or items array.');
        }

        const activeItems = (items as Array<{ isDeleted?: boolean }>).filter(i => !i.isDeleted).length;
        replaceAllData(items, projects, settings);
        setState('success');
        setMessage(
          `Imported ${activeItems} task${activeItems !== 1 ? 's' : ''}` +
          (projects.length ? ` and ${projects.length} project${projects.length !== 1 ? 's' : ''}` : '') +
          '.'
        );
      } catch (err) {
        setState('error');
        setMessage(err instanceof Error ? err.message : 'Could not parse the file.');
      }
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  return (
    <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-sm mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Upload className="w-4 h-4 text-foreground" />
        <h3 className="text-base font-semibold text-foreground">Import data</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        Load tasks from a Clarity JSON export. Your existing data will be replaced.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }}
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-6 cursor-pointer transition-all ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border/60 hover:border-border hover:bg-muted/30'
        }`}
      >
        <Upload className={`w-6 h-6 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className="text-sm text-muted-foreground">
          {isDragging ? 'Drop to import' : 'Tap to choose file, or drag & drop'}
        </span>
        <span className="text-xs text-muted-foreground/60">.json</span>
      </div>

      {state === 'success' && (
        <div className="flex items-center gap-2 mt-3 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {message}
        </div>
      )}
      {state === 'error' && (
        <div className="flex items-start gap-2 mt-3 p-2.5 rounded-xl bg-destructive/10">
          <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{message}</p>
        </div>
      )}
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

      {/* Import */}
      <ImportDataSection />

      {/* Sync sections */}
      <div className="mb-8 flex flex-col gap-4">
        <CrossDeviceSyncSection />
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
