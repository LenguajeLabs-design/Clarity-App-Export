import { useState } from "react";
import { DataBackupSection } from "@/components/data-backup-section";
import { useAppData } from "@/lib/useAppData";
import { useSyncStatus } from "@/lib/useSyncStatus";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { Switch } from "@/components/ui/switch";
import {
  Cloud,
  Sun,
  Moon,
  Monitor,
  CloudUpload,
  LogOut,
} from "lucide-react";

function FirebaseAccountSection() {
  const { user, signOutUser } = useFirebaseAuth();
  const { promoteCurrentDeviceData, cloudReady, items, projects } = useAppData();
  const [promoting, setPromoting] = useState(false);
  const [promotionMessage, setPromotionMessage] = useState('');

  async function handlePromoteCurrentDevice() {
    if (!window.confirm("Make this device the cloud copy? Cloud records missing from this device will be marked deleted on all devices. Export a backup first. Continue only if you have verified this device has all your data.")) return;
    setPromoting(true);
    setPromotionMessage('');
    try {
      await promoteCurrentDeviceData();
      setPromotionMessage('This device is now the current cloud copy. Other signed-in devices will update automatically.');
    } catch {
      setPromotionMessage('Could not upload this device yet. Check your connection and try again.');
    } finally {
      setPromoting(false);
    }
  }

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
      <div className="mt-5 rounded-xl border border-amber-300/60 bg-amber-50/70 p-4 dark:border-amber-700/50 dark:bg-amber-950/20">
        <p className="text-sm font-semibold text-foreground">Phone data recovery</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          If this device has your newest data and another device shows an older copy, use this once to make the current phone data the cloud copy.
        </p>
        <button
          onClick={() => void handlePromoteCurrentDevice()}
          disabled={promoting || !cloudReady || (items.length === 0 && projects.length === 0)}
          className="mt-3 flex items-center gap-2 rounded-xl border border-amber-400/70 bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-amber-100/60 disabled:opacity-60 dark:hover:bg-amber-900/30"
        >
          <CloudUpload className="h-3.5 w-3.5" />
          {promoting ? 'Uploading current device data…' : 'Make this device current'}
        </button>
        {promotionMessage && <p className="mt-2 text-xs leading-5 text-muted-foreground">{promotionMessage}</p>}
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
      <DataBackupSection />

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
