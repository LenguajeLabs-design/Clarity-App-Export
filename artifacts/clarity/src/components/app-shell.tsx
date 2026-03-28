import { useEffect } from "react";
import { BottomNav } from "./bottom-nav";
import { useAppData } from "@/lib/useAppData";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { settings } = useAppData();
  
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('large-text', settings.largeText);
    root.classList.toggle('high-contrast', settings.highContrast);
    root.classList.toggle('reduce-motion', settings.reducedMotion);
  }, [settings]);

  return (
    <div className="min-h-screen bg-accent/20 flex justify-center w-full">
      <div className="w-full max-w-[430px] bg-background min-h-screen flex flex-col relative shadow-2xl overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-[100px] no-scrollbar">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
