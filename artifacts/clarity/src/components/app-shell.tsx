import { useEffect } from "react";
import { BottomNav } from "./bottom-nav";
import { useAppData } from "@/lib/useAppData";
import { Link, useLocation } from "wouter";
import { PenLine } from "lucide-react";
import appIcon from "/icon.png";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { settings } = useAppData();
  const [location] = useLocation();

  // Apply accessibility settings as CSS classes on the html element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('large-text', settings.largeText);
    root.classList.toggle('high-contrast', settings.highContrast);
    root.classList.toggle('reduce-motion', settings.reducedMotion);
  }, [settings]);

  // The capture screen is the home route — it has its own full layout, no shared header needed
  const isCapture = location === '/';

  return (
    <div className="min-h-screen bg-accent/20 flex justify-center w-full">
      <div className="w-full max-w-[430px] bg-background min-h-screen flex flex-col relative shadow-2xl overflow-hidden">
        {/* Shared header — shown on all screens except the capture home */}
        {!isCapture && (
          <header className="flex items-center justify-between px-6 pt-6 pb-2 flex-shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors"
            >
              <img src={appIcon} alt="Clarity" className="w-6 h-6 rounded-[6px] shadow-sm object-cover" />
              <span className="text-sm font-semibold tracking-wide font-display">Clarity</span>
            </Link>
            {/* Quick-capture shortcut from any non-home screen */}
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors py-2 px-3 rounded-xl hover:bg-primary/5 active:scale-95"
              aria-label="Quick capture"
            >
              <PenLine className="w-4 h-4" />
              Capture
            </Link>
          </header>
        )}

        <main className="flex-1 overflow-y-auto pb-[100px] no-scrollbar">
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
