import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, ChevronLeft, Clock3, FolderKanban, InboxIcon, Pause, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { CapturedItem, Project } from "@/lib/types";
import { useAppData } from "@/lib/useAppData";

const REVIEW_KEY = "clarity_weekly_review_v2";
const TOTAL_STEPS = 4;

interface ReviewSession {
  started: boolean;
  active: boolean;
  step: number;
  waitingIndex: number;
  projectIndex: number;
}

const EMPTY_SESSION: ReviewSession = { started: false, active: false, step: 0, waitingIndex: 0, projectIndex: 0 };

function readSession(): ReviewSession {
  try {
    return { ...EMPTY_SESSION, ...JSON.parse(localStorage.getItem(REVIEW_KEY) ?? "{}") };
  } catch {
    return EMPTY_SESSION;
  }
}

function ReviewHeader({ step, onPause }: { step: number; onPause: () => void }) {
  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Weekly reset</p><p className="text-sm font-semibold">Step {step + 1} of {TOTAL_STEPS}</p></div>
        <button onClick={onPause} className="flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"><Pause className="h-4 w-4" /> Pause</button>
      </div>
      <div className="flex gap-2" aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}>
        {Array.from({ length: TOTAL_STEPS }).map((_, index) => <div key={index} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-border"}`} />)}
      </div>
    </div>
  );
}

function StepActions({ back, next, nextLabel = "Keep going" }: { back?: () => void; next: () => void; nextLabel?: string }) {
  return (
    <div className="mt-auto flex gap-3 pt-6">
      {back && <Button variant="ghost" onClick={back} className="h-14 w-14 rounded-2xl px-0" aria-label="Previous step"><ChevronLeft className="h-5 w-5" /></Button>}
      <Button onClick={next} className="h-14 flex-1 rounded-2xl text-lg shadow-lg shadow-primary/15">{nextLabel}</Button>
    </div>
  );
}

export default function Review() {
  const { items, projects, updateItem, updateProject } = useAppData();
  const [, setLocation] = useLocation();
  const restored = useMemo(readSession, []);
  const [session, setSession] = useState(restored);
  const [nextAction, setNextAction] = useState("");

  const untriaged = items.filter((item: CapturedItem) => !item.isTriaged && !item.isDeleted);
  const waitingItems = items.filter((item: CapturedItem) => item.isTriaged && !item.isDeleted && !item.isCompleted && !!item.waitingOn);
  const activeProjects = projects.filter((project: Project) => project.status !== "done");
  const weekItems = items.filter((item: CapturedItem) => item.isTriaged && !item.isDeleted && !item.isCompleted && item.timing === "this-week");
  const priorityCount = weekItems.filter((item: CapturedItem) => item.isPriority).length;
  const waitingItem = waitingItems[session.waitingIndex];
  const project = activeProjects[session.projectIndex];

  useEffect(() => { if (session.started) localStorage.setItem(REVIEW_KEY, JSON.stringify(session)); }, [session]);
  useEffect(() => { setNextAction(project?.nextAction ?? ""); }, [project?.id, project?.nextAction]);

  const start = () => setSession((current) => ({ ...current, started: true, active: true }));
  const pause = () => setSession((current) => ({ ...current, active: false }));
  const moveTo = (step: number) => setSession((current) => ({ ...current, step }));
  const advanceWaiting = () => setSession((current) => ({ ...current, waitingIndex: current.waitingIndex + 1 }));
  const advanceProject = () => setSession((current) => ({ ...current, projectIndex: current.projectIndex + 1 }));
  const finishReview = () => { localStorage.removeItem(REVIEW_KEY); setSession(EMPTY_SESSION); setLocation("/today"); };

  if (!session.active) {
    return (
      <div className="flex h-full flex-col p-6 animate-in fade-in duration-300">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="h-7 w-7" /></div>
          <div><h1 className="font-display text-2xl font-bold">Weekly reset</h1><p className="text-sm text-muted-foreground">A calm check-in, not a test.</p></div>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-4"><span className="text-sm font-medium text-muted-foreground">Inbox</span><span className="font-semibold">{untriaged.length} waiting</span></div>
          <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-4"><span className="text-sm font-medium text-muted-foreground">Waiting on</span><span className="font-semibold">{waitingItems.length}</span></div>
          <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-4"><span className="text-sm font-medium text-muted-foreground">Active projects</span><span className="font-semibold">{activeProjects.length}</span></div>
          <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-4"><span className="text-sm font-medium text-muted-foreground">Weekly priorities</span><span className="font-semibold">{priorityCount} of 3</span></div>
        </div>
        <div className="pt-8"><Button onClick={start} className="h-16 w-full rounded-2xl text-xl shadow-lg shadow-primary/20">{session.started ? "Resume review" : "Start 5-minute review"}</Button><p className="mt-3 text-center text-xs text-muted-foreground">You can pause anytime. Your place is saved.</p></div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5 no-scrollbar">
      <ReviewHeader step={session.step} onPause={pause} />

      {session.step === 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-0 flex-1 flex-col">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><InboxIcon className="h-7 w-7" /></div>
          <h1 className="font-display text-3xl font-bold leading-tight">Give loose thoughts a home</h1>
          <p className="mt-3 text-lg text-muted-foreground">{untriaged.length ? `${untriaged.length} ${untriaged.length === 1 ? "task is" : "tasks are"} safely waiting.` : "Your inbox is already clear."}</p>
          <div className="mt-8 rounded-[1.5rem] border border-border/60 bg-card p-5"><p className="font-semibold">{untriaged.length ? "Sort a few now, or keep going." : "Nothing needs your attention here."}</p><p className="mt-1 text-sm text-muted-foreground">A clear inbox is helpful, not required.</p>{untriaged.length > 0 && <Button variant="outline" onClick={() => setLocation("/inbox")} className="mt-5 h-12 w-full rounded-xl">Open Inbox</Button>}</div>
          <StepActions next={() => moveTo(1)} />
        </motion.div>
      )}

      {session.step === 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-0 flex-1 flex-col">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Clock3 className="h-7 w-7" /></div>
          <h1 className="font-display text-3xl font-bold leading-tight">Check what depends on others</h1><p className="mt-3 text-muted-foreground">One quick decision at a time.</p>
          <div className="mt-8 flex-1">
            {waitingItem ? (
              <div className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-sm"><p className="font-display text-2xl font-bold leading-snug">{waitingItem.text}</p><p className="mt-3 text-sm text-muted-foreground">Waiting on <span className="font-semibold text-foreground">{waitingItem.waitingOn}</span></p><div className="mt-6 grid grid-cols-2 gap-3"><Button variant="outline" onClick={advanceWaiting} className="h-14 rounded-xl">Still waiting</Button><Button onClick={() => updateItem(waitingItem.id, { waitingOn: null, isCompleted: true, completedAt: new Date().toISOString() })} className="h-14 rounded-xl"><Check className="mr-2 h-4 w-4" />Done</Button></div><button onClick={advanceWaiting} className="mt-3 min-h-[44px] w-full rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted">Not now</button></div>
            ) : (
              <div className="rounded-[1.75rem] bg-primary/5 p-6 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-primary" /><p className="mt-3 text-lg font-semibold">That is enough for now</p><p className="mt-1 text-sm text-muted-foreground">No more waiting items need a decision.</p></div>
            )}
          </div>
          <StepActions back={() => moveTo(0)} next={() => moveTo(2)} />
        </motion.div>
      )}

      {session.step === 2 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-0 flex-1 flex-col">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FolderKanban className="h-7 w-7" /></div>
          <h1 className="font-display text-3xl font-bold leading-tight">Make the next step visible</h1><p className="mt-3 text-muted-foreground">A project only needs one clear next action.</p>
          <div className="mt-8 flex-1">
            {project ? (
              <div className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-sm"><p className="font-display text-2xl font-bold leading-snug">{project.title}</p><label htmlFor="review-next-action" className="mb-2 mt-5 block text-sm font-semibold text-muted-foreground">Next visible action</label><input id="review-next-action" value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="What can you physically do next?" className="h-14 w-full rounded-xl border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/20" /><Button onClick={() => { updateProject(project.id, { nextAction: nextAction.trim(), status: "in-progress" }); advanceProject(); }} className="mt-4 h-14 w-full rounded-xl">Save and continue</Button><div className="mt-2 grid grid-cols-2 gap-2"><button onClick={advanceProject} className="min-h-[44px] rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted">Looks good</button><button onClick={() => updateProject(project.id, { status: "done" })} className="min-h-[44px] rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted">Project done</button></div></div>
            ) : (
              <div className="rounded-[1.75rem] bg-primary/5 p-6 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-primary" /><p className="mt-3 text-lg font-semibold">Projects checked</p><p className="mt-1 text-sm text-muted-foreground">You have given enough attention here.</p></div>
            )}
          </div>
          <StepActions back={() => moveTo(1)} next={() => moveTo(3)} />
        </motion.div>
      )}

      {session.step === 3 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-0 flex-1 flex-col">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="h-7 w-7" /></div>
          <h1 className="font-display text-3xl font-bold leading-tight">Choose what matters most</h1><p className="mt-3 text-muted-foreground">Pick up to three priorities. Fewer is completely fine.</p>
          <div className="mt-6 flex-1 space-y-2 overflow-y-auto pb-2 no-scrollbar">
            {weekItems.length ? weekItems.map((entry: CapturedItem) => {
              const selected = entry.isPriority;
              const disabled = !selected && priorityCount >= 3;
              return <button key={entry.id} disabled={disabled} onClick={() => updateItem(entry.id, { isPriority: !selected })} className={`flex min-h-[64px] w-full items-center gap-3 rounded-2xl border px-4 text-left transition-all active:scale-[0.99] ${selected ? "border-primary bg-primary/5" : "border-border/60 bg-card"} ${disabled ? "opacity-45" : ""}`}><span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{selected && <Check className="h-4 w-4" />}</span><span className="font-medium leading-snug">{entry.text}</span></button>;
            }) : <div className="rounded-[1.75rem] bg-card p-6 text-center"><p className="font-semibold">Nothing is scheduled this week</p><p className="mt-1 text-sm text-muted-foreground">You can finish without inventing more work.</p></div>}
          </div>
          <div className="mt-4 rounded-2xl bg-muted/50 px-4 py-3 text-center text-sm font-semibold">{priorityCount} of 3 selected</div>
          <StepActions back={() => moveTo(2)} next={finishReview} nextLabel="Finish review" />
        </motion.div>
      )}
    </div>
  );
}
