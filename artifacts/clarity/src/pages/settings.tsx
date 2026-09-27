import { useState, useRef } from "react";
import { useAppData } from "@/lib/useAppData";
import { useSyncStatus } from "@/lib/useSyncStatus";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { Switch } from "@/components/ui/switch";
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Monitor,
  Upload,
  LogOut,
} from "lucide-react";

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
          // Standard Clarity export: { items, projects, settings, syncedAt }
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

function FirebaseAccountSection() {
  const { user, signOutUser } = useFirebaseAuth();
  return (
    <div className="bg-card p-5 rounded-2xl border border-primary/20 shadow-sm mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Cloud className="w-4 h-4 text-primary" />
        <h3 className="text-base font-semibold text-foreground">Google account sync</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Your Clarity data syncs automatically across devices through your Firebase account.
      </p>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{user?.displayName ?? "Google account"}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email ?? "Signed in"}</p>
        </div>
        <button
          onClick={() => void signOutUser()}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </div>
  );
}

// ─── Main Settings page ───────────────────────────────────────────────────────

export default function Settings() {
  const { settings, updateSettings } = useAppData();
  const { status } = useSyncStatus();
  const { user } = useFirebaseAuth();

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
        <FirebaseAccountSection />
      </div>

      <div className="h-px bg-border/60 w-full mb-8" />

      {/* Data note */}
      <div className="bg-muted/50 p-6 rounded-2xl border border-border/50 mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">Your data</h3>
        <p className="text-base text-muted-foreground leading-relaxed">
          {status === "synced"
            ? "Firebase is syncing your data automatically across signed-in devices."
            : "Your data is stored locally while Firebase finishes connecting."}
        </p>
      </div>

      {/* Privacy promise */}
      <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10">
        <h3 className="text-2xl font-display font-bold text-primary mb-3">Privacy Promise</h3>
        <p className="text-lg text-foreground/80 leading-relaxed font-medium">
          {user
            ? "Your data is scoped to your Google account in Firestore. Nothing is shared with other users. This app doesn't track you."
            : "Everything stays on your device until you sign in. This app doesn't track you."}
        </p>
      </div>

      {/* Byline */}
      <div className="text-center py-8 flex flex-col gap-1">
        <p className="text-sm font-semibold text-foreground/40 tracking-wide font-display">Clarity</p>
        <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-[260px] mx-auto">
          A calm task manager for ADHD minds — capture everything, sort what matters, act with focus.
        </p>
      </div>
    </div>
  );
}
