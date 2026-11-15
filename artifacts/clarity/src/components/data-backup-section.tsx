import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppData } from "@/lib/useAppData";
import { downloadBackup, MAX_BACKUP_BYTES, parseBackup, type BackupData } from "@/lib/backup";

export function DataBackupSection() {
  const { items, projects, settings, replaceAllData, cloudReady } = useAppData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BackupData | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  function exportData() {
    try {
      downloadBackup({ items, projects, settings });
      setMessage("Backup download started. Save the JSON file somewhere safe.");
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create the backup.");
    }
  }

  async function chooseFile(file: File) {
    const request = ++requestRef.current;
    setPending(null);
    setMessage("");
    setError("");
    try {
      if (!file.name.toLowerCase().endsWith(".json")) throw new Error("Please choose a .json backup file.");
      if (file.size > MAX_BACKUP_BYTES) throw new Error("This file is larger than the 20 MB backup limit.");
      const data = parseBackup(JSON.parse(await file.text()), settings);
      if (request === requestRef.current) setPending(data);
    } catch (reason) {
      if (request === requestRef.current) setError(reason instanceof Error ? reason.message : "Could not read this backup. Nothing was imported.");
    }
  }

  async function confirmImport() {
    if (!pending || !cloudReady) return;
    setBusy(true);
    setError("");
    try {
      // Initiate an independent recovery copy before any local/cloud changes.
      downloadBackup({ items, projects, settings });
      await replaceAllData(pending.items, pending.projects, pending.settings);
      setPending(null);
      setMessage("Backup imported and uploaded. Other cloud records have been kept.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Import did not finish. Keep your recovery backup and check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const orphanCount = pending?.items.filter((item) => item.projectId && !pending.projects.some((project) => project.id === item.projectId)).length ?? 0;

  return (
    <section className="bg-card p-5 rounded-2xl border border-border/60 shadow-sm mb-4" aria-labelledby="backup-title">
      <h3 id="backup-title" className="text-base font-semibold text-foreground">Your backup</h3>
      <p className="mt-1 mb-4 text-sm text-muted-foreground leading-relaxed">
        Save all tasks, projects, and appearance settings as a JSON file. Completed and deleted records are included.
      </p>
      {!cloudReady && <p className="mb-3 text-xs text-muted-foreground">You can export this browser’s copy now. Wait for sync to finish before treating it as a complete cloud backup.</p>}
      <div className="flex flex-wrap gap-3">
        <button onClick={exportData} className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Download className="h-4 w-4" /> Export My Data
        </button>
        <button onClick={() => inputRef.current?.click()} disabled={busy} className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
          <Upload className="h-4 w-4" /> Import Data
        </button>
      </div>
      <input ref={inputRef} type="file" accept=".json,application/json" className="sr-only" aria-label="Choose Clarity backup" onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) void chooseFile(file);
      }} />
      {message && <p role="status" className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>}
      {error && !pending && <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
      <Dialog open={pending !== null} onOpenChange={(open) => { if (!open && !busy) setPending(null); }}>
        <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Import this backup?</DialogTitle>
            <DialogDescription>
              This replaces the tasks, projects, and settings in this browser and uploads the imported records to your Google account. Matching cloud records will be overwritten; other cloud records will be kept and may appear again.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm font-medium">{pending?.items.length ?? 0} task records · {pending?.projects.length ?? 0} project records</p>
          <p className="text-sm text-muted-foreground">A backup of this browser’s current data will download before importing. Keep both files until you have checked the result.</p>
          {orphanCount > 0 && <p className="text-sm text-amber-700 dark:text-amber-400">{orphanCount} task records refer to projects absent from this file. Their references will be preserved.</p>}
          {!cloudReady && <p role="status" className="text-sm text-muted-foreground">Connect and wait for cloud sync to finish before importing.</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-col gap-2">
            <button onClick={() => void confirmImport()} disabled={busy || !cloudReady} className="min-h-11 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Importing…" : "Back up and import"}</button>
            <button onClick={() => setPending(null)} disabled={busy} className="min-h-11 rounded-xl border border-border px-4 py-3 text-sm font-semibold disabled:opacity-50">Cancel</button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
