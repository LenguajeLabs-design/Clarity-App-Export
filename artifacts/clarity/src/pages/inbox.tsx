import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Check, CheckCircle2, ChevronDown, Clock3, Folder, InboxIcon, Pause, Sparkles, Trash2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AREA_COLOR } from "@/lib/colors";
import { AreaOfLife, CapturedItem, Project } from "@/lib/types";
import { useAppData } from "@/lib/useAppData";

type SprintTarget = 3 | 5 | "all";
type InlinePanel = "waiting" | "project" | "details" | null;
interface SavedSession { active: boolean; target: SprintTarget; processed: number; skippedIds: string[] }

const SESSION_KEY = "clarity_triage_session_v2";

function readSession(): SavedSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as SavedSession | null;
    return value?.active ? value : null;
  } catch { return null; }
}

function ActionButton({ icon: Icon, label, hint, onClick }: {
  icon: typeof Clock3; label: string; hint: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="min-h-[68px] rounded-2xl border border-border/70 bg-card px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-primary/10">
      <span className="flex items-center gap-2 font-semibold text-foreground"><Icon className="h-4 w-4 text-primary" />{label}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
    </button>
  );
}

export default function Inbox() {
  const { items, projects, updateItem } = useAppData();
  const { toast } = useToast();
  const untriaged = useMemo(() => items.filter((i: CapturedItem) => !i.isTriaged && !i.isDeleted), [items]);
  const restored = useMemo(() => readSession(), []);
  const [active, setActive] = useState(restored?.active ?? false);
  const [target, setTarget] = useState<SprintTarget>(restored?.target ?? 3);
  const [processed, setProcessed] = useState(restored?.processed ?? 0);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(() => new Set(restored?.skippedIds ?? []));
  const [panel, setPanel] = useState<InlinePanel>(null);
  const [waitingOn, setWaitingOn] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [area, setArea] = useState<AreaOfLife | null>(null);
  const [nextAction, setNextAction] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [queueOpen, setQueueOpen] = useState(false);

  const available = untriaged.filter((i) => !skippedIds.has(i.id));
  const item = available[0];
  const reachedTarget = target !== "all" && processed >= target;
  const sessionComplete = active && (reachedTarget || !item);

  useEffect(() => {
    if (!active) return;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ active, target, processed, skippedIds: [...skippedIds] }));
  }, [active, target, processed, skippedIds]);

  const clearDraft = () => {
    setPanel(null); setWaitingOn(""); setSelectedProject(""); setArea(null); setNextAction(""); setScheduledDate("");
  };
  const startSprint = (nextTarget: SprintTarget) => {
    setTarget(nextTarget); setProcessed(0); setSkippedIds(new Set()); setActive(true); clearDraft();
  };
  const stopSprint = () => {
    setActive(false); setProcessed(0); setSkippedIds(new Set()); clearDraft(); localStorage.removeItem(SESSION_KEY);
  };
  const finish = (updates: Partial<CapturedItem>, message: string) => {
    if (!item) return;
    const previous = { ...item };
    updateItem(item.id, { type: item.type ?? "task", area: area ?? item.area, nextAction: nextAction.trim() || item.nextAction, ...updates, isTriaged: true });
    setProcessed((n) => n + 1); clearDraft();
    toast({
      description: message,
      action: (
        <button
          onClick={() => {
            updateItem(previous.id, previous);
            setProcessed((n) => Math.max(0, n - 1));
          }}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Undo
        </button>
      ),
      duration: 5000,
    });
  };
  const skip = () => {
    if (!item) return;
    setSkippedIds((current) => new Set(current).add(item.id)); clearDraft();
  };

  if (untriaged.length === 0) return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-7 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-primary/10 text-primary shadow-inner"><Sparkles className="h-12 w-12" /></div>
      <h1 className="mb-3 font-display text-3xl font-bold">Inbox clear</h1>
      <p className="max-w-xs text-lg text-muted-foreground">Everything has a place. Come back when something new arrives.</p>
    </div>
  );

  if (!active) return (
    <div className="flex h-full flex-col p-6 animate-in fade-in duration-300">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><InboxIcon className="h-7 w-7" /></div>
        <div><h1 className="font-display text-2xl font-bold">{untriaged.length} to sort</h1><p className="text-sm text-muted-foreground">Choose a small finish line.</p></div>
      </div>
      <div className="mb-8 flex-1 space-y-2 overflow-y-auto no-scrollbar">
        {untriaged.slice(0, 5).map((entry) => <div key={entry.id} className="rounded-xl border border-border/60 bg-card px-4 py-3 text-sm font-medium">{entry.text}</div>)}
        {untriaged.length > 5 && <p className="px-2 pt-1 text-xs text-muted-foreground">+ {untriaged.length - 5} more safely waiting</p>}
      </div>
      <div className="space-y-3">
        <Button onClick={() => startSprint(3)} className="h-16 w-full rounded-2xl text-xl shadow-lg shadow-primary/20">Sort 3</Button>
        <div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={() => startSprint(5)} className="h-12 rounded-xl">Sort 5</Button><Button variant="ghost" onClick={() => startSprint("all")} className="h-12 rounded-xl">Clear everything</Button></div>
      </div>
    </div>
  );

  if (sessionComplete) return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-7 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 text-green-600"><CheckCircle2 className="h-10 w-10" /></div>
      <h1 className="mb-2 font-display text-3xl font-bold">{processed} {processed === 1 ? "thing" : "things"} sorted</h1>
      <p className="mb-8 max-w-xs text-muted-foreground">{untriaged.length > 0 ? `${untriaged.length} still waiting. Taking the win is allowed.` : "Your inbox is clear."}</p>
      <div className="w-full max-w-sm space-y-3">{untriaged.length > 0 && <Button onClick={() => startSprint(3)} className="h-14 w-full rounded-2xl text-lg">Sort 3 more</Button>}<Button variant="outline" onClick={stopSprint} className="h-14 w-full rounded-2xl text-lg">{untriaged.length > 0 ? "Take the win" : "Done"}</Button></div>
    </div>
  );
  if (!item) return null;

  const targetLabel = target === "all" ? `${untriaged.length} left` : `${processed + 1} of ${target}`;
  const currentArea = area ?? item.area;
  const queueItems = [item, ...untriaged.filter((entry) => entry.id !== item.id)];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5 no-scrollbar animate-in fade-in duration-200">
      <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Sorting</p><p className="text-sm font-semibold">{targetLabel}</p></div><button onClick={stopSprint} className="flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"><Pause className="h-4 w-4" />Pause</button></div>
      <div className="mb-5 overflow-hidden rounded-2xl border border-border/60 bg-muted/30">
        <button
          type="button"
          aria-expanded={queueOpen}
          aria-controls="triage-queue"
          onClick={() => setQueueOpen((open) => !open)}
          className="flex min-h-[48px] w-full items-center justify-between px-4 text-left text-sm font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground focus:outline-none focus:ring-4 focus:ring-inset focus:ring-primary/10"
        >
          <span>{untriaged.length} {untriaged.length === 1 ? "task" : "tasks"} safely in your inbox</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${queueOpen ? "rotate-180" : ""}`} />
        </button>
        {queueOpen && (
          <div id="triage-queue" className="border-t border-border/60 px-3 py-2">
            <div className="max-h-48 space-y-1 overflow-y-auto no-scrollbar">
              {queueItems.map((entry, index) => (
                <div key={entry.id} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm ${index === 0 ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                  <span className="mt-0.5 min-w-8 text-xs font-bold uppercase tracking-wide text-primary">{index === 0 ? "Now" : index + 1}</span>
                  <span className="min-w-0 flex-1 break-words font-medium">{entry.text}</span>
                </div>
              ))}
            </div>
            <p className="px-3 pb-1 pt-2 text-xs text-muted-foreground">Nothing is lost. Sort only the task marked Now.</p>
          </div>
        )}
      </div>
      <div className="mb-5 rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-sm">
        <p className="break-words font-display text-2xl font-bold leading-snug">{item.text}</p>
        {currentArea && <div className="mt-4 flex items-center gap-2 text-xs font-semibold capitalize text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: AREA_COLOR[currentArea] }} />{currentArea}</div>}
      </div>

      {!panel && <>
        <div className="grid grid-cols-2 gap-3">
          <ActionButton icon={Clock3} label="Today" hint={format(new Date(), "EEE, MMM d")} onClick={() => finish({ timing: "today", scheduledDate: format(new Date(), "yyyy-MM-dd") }, "Moved to Today")} />
          <ActionButton icon={CalendarDays} label="This week" hint="Before the week ends" onClick={() => finish({ timing: "this-week", scheduledDate: null }, "Moved to This week")} />
          <ActionButton icon={ChevronDown} label="Later" hint="Keep it, no pressure" onClick={() => finish({ timing: "later", scheduledDate: null }, "Saved for later")} />
          <ActionButton icon={UserRound} label="Waiting on…" hint="Someone else goes first" onClick={() => setPanel("waiting")} />
          <ActionButton icon={Folder} label="Add to project" hint="Give it a home" onClick={() => setPanel("project")} />
          <ActionButton icon={Check} label="Done" hint="Already handled" onClick={() => finish({ isCompleted: true, completedAt: new Date().toISOString() }, "Marked done")} />
        </div>
        <div className="mt-4 flex items-center justify-between"><button onClick={skip} className="min-h-[48px] rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted">Not now</button><button onClick={() => setPanel("details")} className="min-h-[48px] rounded-xl px-3 text-sm font-semibold text-primary hover:bg-primary/5">Add details</button><button onClick={() => finish({ isDeleted: true }, "Moved to trash")} aria-label="Delete task" className="flex h-12 w-12 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>
      </>}

      {panel === "waiting" && <div className="rounded-2xl border border-border/60 bg-card p-5">
        <label htmlFor="waiting-on" className="mb-2 block text-lg font-semibold">Who are you waiting on?</label><input id="waiting-on" value={waitingOn} onChange={(e) => setWaitingOn(e.target.value)} placeholder="Name or role" autoFocus className="h-14 w-full rounded-xl border border-border bg-background px-4 text-lg outline-none focus:ring-2 focus:ring-primary/20" />
        <div className="mt-4 flex gap-3"><Button variant="ghost" onClick={() => setPanel(null)} className="h-12 flex-1 rounded-xl">Back</Button><Button disabled={!waitingOn.trim()} onClick={() => finish({ waitingOn: waitingOn.trim(), timing: "this-week" }, `Waiting on ${waitingOn.trim()}`)} className="h-12 flex-1 rounded-xl">Save</Button></div>
      </div>}

      {panel === "project" && <div className="rounded-2xl border border-border/60 bg-card p-5">
        <p className="mb-3 text-lg font-semibold">Choose a project</p><div className="max-h-64 space-y-2 overflow-y-auto no-scrollbar">{projects.filter((p: Project) => !p.isDeleted && p.status !== "done").map((p: Project) => <button key={p.id} onClick={() => setSelectedProject(p.id)} className={`min-h-[48px] w-full rounded-xl border px-4 text-left font-medium ${selectedProject === p.id ? "border-primary bg-primary/5" : "border-border/60"}`}>{p.title}</button>)}{projects.filter((p: Project) => !p.isDeleted && p.status !== "done").length === 0 && <p className="py-4 text-sm text-muted-foreground">No active projects yet.</p>}</div>
        <div className="mt-4 flex gap-3"><Button variant="ghost" onClick={() => setPanel(null)} className="h-12 flex-1 rounded-xl">Back</Button><Button disabled={!selectedProject} onClick={() => finish({ projectId: selectedProject, timing: "this-week" }, "Added to project")} className="h-12 flex-1 rounded-xl">Add</Button></div>
      </div>}

      {panel === "details" && <div className="rounded-2xl border border-border/60 bg-card p-5">
        <p className="mb-4 text-lg font-semibold">Optional details</p><label className="mb-2 block text-sm font-semibold text-muted-foreground">Area</label>
        <div className="mb-4 grid grid-cols-2 gap-2">{(["work", "family", "home", "personal"] as AreaOfLife[]).map((v) => <button key={v} onClick={() => setArea(v)} className={`min-h-[44px] rounded-xl border px-3 text-sm font-semibold capitalize ${area === v ? "border-primary bg-primary/5" : "border-border/60"}`}>{v}</button>)}</div>
        <label htmlFor="next-action" className="mb-2 block text-sm font-semibold text-muted-foreground">First visible action</label><input id="next-action" value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Optional" className="mb-4 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/20" />
        <label htmlFor="scheduled-date" className="mb-2 block text-sm font-semibold text-muted-foreground">Exact date</label><input id="scheduled-date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/20" />
        <div className="mt-4 flex gap-3"><Button variant="ghost" onClick={() => setPanel(null)} className="h-12 flex-1 rounded-xl">Back</Button><Button onClick={() => finish({ timing: scheduledDate ? "this-week" : "later", scheduledDate: scheduledDate || null }, "Details saved")} className="h-12 flex-1 rounded-xl">Save details</Button></div>
      </div>}
    </div>
  );
}
