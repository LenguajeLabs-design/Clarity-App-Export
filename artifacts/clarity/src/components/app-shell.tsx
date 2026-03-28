import { useEffect } from "react";
import { BottomNav } from "./bottom-nav";
import { useAppData } from "@/lib/useAppData";
import { useSyncStatus } from "@/lib/useSyncStatus";
import { MigrationBanner } from "./migration-banner";
import { Link, useLocation } from "wouter";
import { PenLine, Cloud, CloudOff, Loader2, AlertCircle } from "lucide-react";
import appIcon from "/icon.png";

function SyncBadge() {
  const { status, lastSyncedAt, isSupabaseConfigured } = useSyncStatus();

  if (!isSupabaseConfigured) return null;

  if (status === 'syncing') {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Syncing
      </span>
    );
  }

  if (status === 'synced') {
    const timeStr = lastSyncedAt
      ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground" title={timeStr ? `Last synced at ${timeStr}` : 'Synced'}>
        <Cloud className="w-3 h-3 text-green-500" />
        Synced
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="w-3 h-3" />
        Sync error
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
      <CloudOff className="w-3 h-3" />
      Local only
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { settings } = useAppData();
  const [location] = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('large-text', settings.largeText);
    root.classList.toggle('high-contrast', settings.highContrast);
    root.classList.toggle('reduce-motion', settings.reducedMotion);
  }, [settings]);

  const isCapture = location === '/';

  return (
    <div className="min-h-screen bg-accent/20 flex justify-center w-full">
      <div className="w-full max-w-[430px] bg-background min-h-screen flex flex-col relative shadow-2xl overflow-hidden">
        {!isCapture && (
          <header className="flex items-center justify-between px-6 pt-6 pb-2 flex-shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors"
            >
              <img src={appIcon} alt="Clarity" className="w-6 h-6 rounded-[6px] shadow-sm object-cover" />
              <span className="text-sm font-semibold tracking-wide font-display">Clarity</span>
            </Link>
            <div className="flex items-center gap-3">
              <SyncBadge />
              <Link
                href="/"
                className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors py-2 px-3 rounded-xl hover:bg-primary/5 active:scale-95"
                aria-label="Quick capture"
              >
                <PenLine className="w-4 h-4" />
                Capture
              </Link>
            </div>
          </header>
        )}

        <MigrationBanner />

        <main className="flex-1 overflow-y-auto pb-[100px] no-scrollbar">
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
