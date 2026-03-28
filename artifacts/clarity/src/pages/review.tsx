import { useState } from 'react';
import { useAppData } from '@/lib/useAppData';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { InboxIcon, Calendar, Clock } from 'lucide-react';
import { Project, CapturedItem } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isToday, isTomorrow, isThisWeek } from 'date-fns';

function friendlyDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = parseISO(dateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, "EEEE");
  return format(d, "MMM d");
}

// ─── Weekly review checklist items ───────────────────────────────────────────
const CHECKLIST_ITEMS = [
  { id: 'inbox',    label: 'Cleared my inbox' },
  { id: 'projects', label: 'Reviewed active projects' },
  { id: 'waiting',  label: 'Checked what I\'m waiting on' },
  { id: 'upcoming', label: 'Looked at the week ahead' },
  { id: 'priorities', label: 'Set my top priorities' },
  { id: 'capture',  label: 'Got everything out of my head' },
];

export default function Review() {
  const { items, projects, updateItem, updateProject } = useAppData();
  const [step, setStep] = useState(1);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();

  const TOTAL_STEPS = 5;

  const untriaged = items.filter((i: CapturedItem) => !i.isTriaged && !i.isDeleted).length;
  const activeProjects = projects.filter((p: Project) => p.status !== 'done');
  const waitingOnItems = items.filter(
    (i: CapturedItem) => i.isTriaged && !i.isDeleted && !i.isCompleted && !!i.waitingOn
  );
  const upcomingItems = items.filter(
    (i: CapturedItem) => i.isTriaged && !i.isDeleted && !i.isCompleted &&
      (i.timing === 'this-week' || i.timing === 'later')
  ).slice(0, 6);
  const thisWeekItems = items.filter(
    (i: CapturedItem) => i.isTriaged && !i.isDeleted && !i.isCompleted && i.timing === 'this-week'
  );
  const priorityCount = thisWeekItems.filter((i: CapturedItem) => i.isPriority).length;

  const toggleChecklist = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const StepBar = () => (
    <div className="flex gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-full transition-colors duration-500 ${
            step > i ? 'bg-primary' : 'bg-border'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="p-6 h-full flex flex-col">
      <AnimatePresence mode="wait">

        {/* ─── Step 1 — Inbox ─────────────────────────────────────────────── */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
            <StepBar />
            <h1 className="text-4xl font-display font-bold mb-10 leading-tight">Let's check your inbox</h1>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner">
                <InboxIcon className="w-12 h-12 text-primary" />
              </div>
              <p className="text-3xl font-display font-bold mb-4">
                {untriaged > 0 ? `You have ${untriaged} things to sort` : "Your inbox is clear!"}
              </p>
              <p className="text-xl text-muted-foreground">
                {untriaged > 0 ? "Let's deal with those before moving on." : "A clear inbox means a clear mind."}
              </p>
            </div>
            <div className="flex flex-col gap-3 mt-auto pt-8">
              {untriaged > 0 && (
                <Button variant="outline" className="h-16 text-xl rounded-2xl w-full border-border/80" onClick={() => setLocation('/inbox')}>
                  Go sort them
                </Button>
              )}
              <Button className="h-16 text-xl rounded-2xl w-full shadow-lg shadow-primary/20" onClick={() => setStep(2)}>
                Next →
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── Step 2 — Projects ─────────────────────────────────────────── */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col h-full">
            <StepBar />
            <h1 className="text-4xl font-display font-bold mb-10 leading-tight">How are your projects going?</h1>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-4 flex flex-col gap-4">
              {activeProjects.map((p: Project) => (
                <div key={p.id} className="bg-card p-6 rounded-[2rem] shadow-sm border border-border/60">
                  <h3 className="font-display font-bold text-2xl mb-1">{p.title}</h3>
                  <p className="text-muted-foreground text-lg mb-1">Next: {p.nextAction}</p>
                  {p.dueDate && (
                    <p className="text-sm text-primary font-semibold mb-5">Due {friendlyDate(p.dueDate)}</p>
                  )}
                  {!p.dueDate && <div className="mb-5" />}
                  <div className="flex gap-2 p-1 bg-accent/30 rounded-2xl">
                    {(['not-started', 'in-progress', 'done'] as const).map((s, idx) => (
                      <button
                        key={s}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                          p.status === s
                            ? s === 'done' ? 'bg-green-500 text-white shadow-sm' : 'bg-background shadow-sm text-foreground'
                            : 'text-muted-foreground'
                        }`}
                        onClick={() => updateProject(p.id, { status: s })}
                      >
                        {['Not started', 'Active', 'Done'][idx]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {activeProjects.length === 0 && (
                <p className="text-center text-muted-foreground text-lg py-10">No active projects.</p>
              )}
            </div>
            <div className="pt-6 flex gap-3">
              <Button variant="ghost" className="h-16 text-xl rounded-2xl flex-1" onClick={() => setStep(1)}>← Back</Button>
              <Button className="h-16 text-xl rounded-2xl flex-1 shadow-lg shadow-primary/20" onClick={() => setStep(3)}>Next →</Button>
            </div>
          </motion.div>
        )}

        {/* ─── Step 3 — Waiting on ──────────────────────────────────────── */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col h-full">
            <StepBar />
            <h1 className="text-4xl font-display font-bold mb-4 leading-tight">What are you waiting on?</h1>
            <p className="text-xl text-muted-foreground mb-8">Check in on anything that depends on someone else.</p>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
              {waitingOnItems.length === 0 ? (
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-border/60">
                  <Clock className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                  <p className="text-lg text-muted-foreground">Nothing in "waiting on" right now.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {waitingOnItems.map((i: CapturedItem) => (
                    <div key={i.id} className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border/60 min-h-[72px]">
                      <span className="text-2xl flex-shrink-0 mt-0.5">⏳</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-medium leading-snug">{i.text}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Waiting on <span className="font-semibold text-foreground/70">{i.waitingOn}</span>
                        </p>
                        {i.nextAction && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5">Follow-up: {i.nextAction}</p>
                        )}
                      </div>
                      <button
                        onClick={() => updateItem(i.id, { waitingOn: null, isCompleted: true })}
                        className="text-xs font-bold text-green-600 border border-green-300 rounded-xl px-3 py-2 hover:bg-green-50 transition-colors flex-shrink-0 min-h-[40px]"
                      >
                        Done ✓
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-6 flex gap-3">
              <Button variant="ghost" className="h-16 text-xl rounded-2xl flex-1" onClick={() => setStep(2)}>← Back</Button>
              <Button className="h-16 text-xl rounded-2xl flex-1 shadow-lg shadow-primary/20" onClick={() => setStep(4)}>Next →</Button>
            </div>
          </motion.div>
        )}

        {/* ─── Step 4 — What's coming up + pick priorities ─────────────── */}
        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col h-full">
            <StepBar />
            <h1 className="text-4xl font-display font-bold mb-2 leading-tight">Pick your top 3</h1>
            <p className="text-xl text-muted-foreground mb-8">
              {priorityCount >= 3
                ? "You've picked 3 — great. You can change them."
                : `Tap to mark ${3 - priorityCount} more thing${3 - priorityCount !== 1 ? 's' : ''} that matter most.`}
            </p>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
              {thisWeekItems.length === 0 && upcomingItems.length === 0 ? (
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-border/60">
                  <Calendar className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                  <p className="text-lg text-muted-foreground">Nothing scheduled yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(thisWeekItems.length > 0 ? thisWeekItems : upcomingItems).map((i: CapturedItem) => (
                    <div
                      key={i.id}
                      onClick={() => {
                        if (i.isPriority) updateItem(i.id, { isPriority: false });
                        else if (priorityCount < 3) updateItem(i.id, { isPriority: true });
                      }}
                      className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.98] min-h-[72px] ${
                        i.isPriority ? 'border-primary bg-primary/5 shadow-md' : 'border-border/60 bg-card hover:border-border'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${i.isPriority ? 'border-primary bg-primary text-white' : 'border-border/80 bg-background'}`}>
                        {i.isPriority && (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xl leading-snug">{i.text}</p>
                        {i.nextAction && <p className="text-sm text-muted-foreground mt-1 truncate">Next: {i.nextAction}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-6 flex gap-3">
              <Button variant="ghost" className="h-16 text-xl rounded-2xl flex-1" onClick={() => setStep(3)}>← Back</Button>
              <Button className="h-16 text-xl rounded-2xl flex-1 shadow-lg shadow-primary/20" onClick={() => setStep(5)}>Next →</Button>
            </div>
          </motion.div>
        )}

        {/* ─── Step 5 — Weekly review checklist ───────────────────────── */}
        {step === 5 && (
          <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col h-full">
            <StepBar />
            <h1 className="text-4xl font-display font-bold mb-2 leading-tight">Weekly review</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Check off what you covered. {checkedItems.size === CHECKLIST_ITEMS.length ? "You did it all 🎉" : "No pressure to get everything."}
            </p>
            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-3 pb-4">
              {CHECKLIST_ITEMS.map(({ id, label }) => {
                const checked = checkedItems.has(id);
                return (
                  <motion.button
                    key={id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleChecklist(id)}
                    className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all min-h-[72px] text-left ${
                      checked ? 'border-green-400/60 bg-green-50' : 'border-border/60 bg-card hover:border-border'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'border-green-500 bg-green-500' : 'border-border/80'}`}>
                      {checked && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-xl font-medium ${checked ? 'text-green-700 line-through decoration-green-400/60' : 'text-foreground'}`}>
                      {label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
            <div className="pt-6 flex gap-3">
              <Button variant="ghost" className="h-16 text-xl rounded-2xl flex-1" onClick={() => setStep(4)}>← Back</Button>
              <Button
                className="h-16 text-xl rounded-2xl flex-1 shadow-lg shadow-primary/20"
                onClick={() => { setStep(1); setCheckedItems(new Set()); setLocation('/today'); }}
              >
                Done 🎉
              </Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
