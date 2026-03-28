import { useAppData } from "@/lib/useAppData";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  const { settings, updateSettings } = useAppData();
  
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
      
      <div className="h-px bg-border/60 w-full mb-10" />

      {/* Local storage note */}
      <div className="bg-muted/50 p-6 rounded-2xl border border-border/50 mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">Your data lives on this device</h3>
        <p className="text-base text-muted-foreground leading-relaxed">
          Everything is saved in your browser's local storage — no account, no server, no sync.
          If you clear your browser data or switch devices, your data will not carry over.
        </p>
      </div>

      {/* Privacy promise */}
      <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10">
        <h3 className="text-2xl font-display font-bold text-primary mb-3">Privacy Promise</h3>
        <p className="text-lg text-foreground/80 leading-relaxed font-medium">
          Everything stays on your device. Nothing is sent anywhere. This app doesn't track you.
        </p>
      </div>
    </div>
  )
}
