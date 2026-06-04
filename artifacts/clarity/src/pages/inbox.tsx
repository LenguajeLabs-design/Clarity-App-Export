import { useState } from "react";
import { useAppData } from "@/lib/useAppData";
import { Button } from "@/components/ui/button";
import { InboxIcon, Sparkles, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CapturedItem, ItemType, AreaOfLife, Timing, Project } from "@/lib/types";
import { format, addDays } from "date-fns";
import { AREA_COLOR } from "@/lib/colors";
import { AreaFilterBar, AreaFilter } from "@/components/area-filter-bar";

// ─── Choice definitions (max 3 visible per step) ─────────────────────────────

// Step 1 — What kind of thing is this?
const TYPE_CHOICES: { label: string; hint: string; value: ItemType }[] = [
  { label: "A task",    hint: "One clear action I can take",    value: "task" },
  { label: "A project", hint: "More than one step involved",    value: "project" },
  { label: "An event or note", hint: "Something to remember or attend", value: "event" },
];

// Step 1b — Multi-step check (only shown when "task" is picked, to catch sneaky projects)
const MULTISTEP_CHOICES: { label: string; id: string }[] = [
  { id: "no",      label: "Nope — one action does it" },
  { id: "yes",     label: "Actually... it takes a few steps" },
  { id: "notsure", label: "Not sure yet" },
];

// Step 2 — Area of life (Work / Family / Home or personal)
const AREA_CHOICES: { label: string; value: AreaOfLife }[] = [
  { label: "Work",             value: "work" },
  { label: "Family",           value: "family" },
  { label: "Home or personal", value: "home" },
];

const AREA_CHOICE_DOT = ({ value }: { value: AreaOfLife }) => (
  <span
    className="w-3 h-3 rounded-full flex-shrink-0 inline-block mr-2"
    style={{ backgroundColor: AREA_COLOR[value] ?? "#7A8599" }}
  />
);

// Step 3 — Timing
const TIMING_CHOICES: { label: string; value: Timing }[] = [
  { label: "Today",     value: "today" },
  { label: "This week", value: "this-week" },
  { label: "Later",     value: "later" },
];

// Step 5 — What to do with it (primary 3)
const ACTION_PRIMARY: { id: string; label: string }[] = [
  { id: "today",   label: "Do it today" },
  { id: "schedule", label: "Schedule it" },
  { id: "project", label: "Add to a project" },
];

// Step 5b — Less-common actions
const ACTION_SECONDARY: { id: string; label: string }[] = [
  { id: "later",  label: "Not yet — save for later" },
  { id: "delete", label: "Toss it" },
  { id: "back",   label: "← Back to main options" },
];

const SCHEDULE_CHOICES: { label: string; daysAhead: number }[] = [
  { label: "Tomorrow",   daysAhead: 1 },
  { label: "In 3 days",  daysAhead: 3 },
  { label: "Next week",  daysAhead: 7 },
];

// ─── Draft type ───────────────────────────────────────────────────────────────
interface TriageDraft {
  type?: ItemType;
  area?: AreaOfLife;
  timing?: Timing;
  nextAction?: string;
  waitingOn?: string;
}

type SubStep =
  | 'type'
  | 'multistep-check'
  | 'suggest-project'
  | 'area'
  | 'next-action'
  | 'timing'
  | 'waiting-check'
  | 'waiting-who'
  | 'action-primary'
  | 'action-secondary'
  | 'schedule-when'
  | 'project-which';

// ─── Component ────────────────────────────────────────────────────────────────
export default function Inbox() {
  const { items, projects, updateItem, addProject } = useAppData();
  const untriaged = items.filter((i: CapturedItem) => !i.isTriaged && !i.isDeleted);

  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [triageStarted, setTriageStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [subStep, setSubStep] = useState<SubStep>('type');
  const [draft, setDraft] = useState<TriageDraft>({});
  const [nextActionText, setNextActionText] = useState('');
  const [waitingText, setWaitingText] = useState('');
  const [areaFilter, setAreaFilter] = useState<AreaFilter>(null);

  const item = untriaged[index];

  const handleQuickComplete = (id: string) => {
    if (completingIds.has(id)) return;
    setCompletingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      updateItem(id, {
        isCompleted: true,
        isTriaged: true,
        completedAt: new Date().toISOString(),
      });
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 380);
  };

  const resetTriage = () => {
    setTriageStarted(false);
    setIndex(0);
    setSubStep('type');
    setDraft({});
    setNextActionText('');
    setWaitingText('');
  };

  const advance = (updates: Partial<TriageDraft>, next: SubStep) => {
    setDraft((prev) => ({ ...prev, ...updates }));
    setSubStep(next);
  };

  const finishTriage = (actionUpdates: Partial<CapturedItem>) => {
    updateItem(item.id, {
      type: draft.type ?? "task",
      area: draft.area ?? "work",
      timing: draft.timing ?? "later",
      nextAction: draft.nextAction ?? null,
      waitingOn: draft.waitingOn ?? null,
      ...actionUpdates,
      isTriaged: true,
    });
    setDraft({});
    setNextActionText('');
    setWaitingText('');
    setSubStep('type');

    if (index + 1 >= untriaged.length) {
      resetTriage();
    } else {
      setIndex((i) => i + 1);
    }
  };

  // ─── Action handlers ─────────────────────────────────────────────────────
  const handleType = (value: ItemType) => {
    if (value === 'task') {
      advance({ type: 'task' }, 'multistep-check');
    } else if (value === 'project') {
      // Immediately go to area + then create a new project
      advance({ type: 'project' }, 'area');
    } else {
      // event or note — skip next-action, go straight to timing
      advance({ type: value }, 'area');
    }
  };

  const handleMultistep = (id: string) => {
    if (id === 'yes') {
      setSubStep('suggest-project');
    } else {
      // no or not sure — continue as task
      setSubStep('area');
    }
  };

  const handleSuggestProject = (id: string) => {
    if (id === 'yes') {
      advance({ type: 'project' }, 'area');
    } else {
      // keep as task
      setSubStep('area');
    }
  };

  const handleArea = (value: AreaOfLife) => {
    advance({ area: value }, draft.type === 'task' ? 'next-action' : 'timing');
  };

  const handleNextActionSubmit = () => {
    advance({ nextAction: nextActionText.trim() || undefined }, 'timing');
  };

  const handleTiming = (value: Timing) => {
    // After timing, ask about "waiting on" only for tasks
    if (draft.type === 'task') {
      advance({ timing: value }, 'waiting-check');
    } else {
      advance({ timing: value }, 'action-primary');
    }
  };

  const handleWaitingCheck = (id: string) => {
    if (id === 'yes') {
      setSubStep('waiting-who');
    } else {
      setSubStep('action-primary');
    }
  };

  const handleWaitingWho = () => {
    advance({ waitingOn: waitingText.trim() || undefined }, 'action-primary');
  };

  const handleActionPrimary = (id: string) => {
    if (id === 'today') {
      finishTriage({ timing: 'today', scheduledDate: format(new Date(), 'yyyy-MM-dd') });
    } else if (id === 'schedule') {
      setSubStep('schedule-when');
    } else if (id === 'project') {
      setSubStep('project-which');
    }
  };

  const handleActionSecondary = (id: string) => {
    if (id === 'later') {
      finishTriage({ timing: 'later' });
    } else if (id === 'delete') {
      finishTriage({ isDeleted: true });
    } else if (id === 'back') {
      setSubStep('action-primary');
    }
  };

  const handleSchedule = (daysAhead: number) => {
    const date = addDays(new Date(), daysAhead);
    finishTriage({
      timing: daysAhead <= 1 ? 'today' : 'this-week',
      scheduledDate: format(date, 'yyyy-MM-dd'),
    });
  };

  const handleProjectAssign = (project: Project) => {
    finishTriage({ projectId: project.id, type: 'task', timing: 'this-week' });
  };

  const handleConvertToProject = () => {
    // Turn this item into a project and triage the item as its first next action
    addProject({
      title: item.text,
      area: draft.area ?? 'work',
      nextAction: nextActionText.trim() || 'Define first step',
      status: 'not-started',
      dueDate: null,
    });
    finishTriage({ type: 'project', isDeleted: true }); // remove from items since it's now a project
  };

  // ─── Landing screen ───────────────────────────────────────────────────────
  if (!triageStarted || !item) {
    const filteredUntriaged = areaFilter
      ? untriaged.filter((i: CapturedItem) => i.area === areaFilter)
      : untriaged;

    return (
      <div className="flex flex-col h-full p-6 animate-in fade-in duration-500">
        {untriaged.length > 0 ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary flex-shrink-0">
                <InboxIcon className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                  {untriaged.length} {untriaged.length === 1 ? "thing" : "things"} to sort
                </h1>
                <p className="text-muted-foreground text-sm">Take a breath. We'll do this one at a time.</p>
              </div>
            </div>

            {/* Area filter */}
            <div className="mb-4">
              <AreaFilterBar value={areaFilter} onChange={setAreaFilter} />
            </div>

            {/* Preview list */}
            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2 mb-6">
              {filteredUntriaged.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  No items in this area yet.
                </p>
              ) : (
                filteredUntriaged.map((i: CapturedItem) => {
                  const areaColor = i.area ? AREA_COLOR[i.area] : undefined;
                  const completing = completingIds.has(i.id);
                  return (
                    <motion.div
                      key={i.id}
                      layout
                      animate={completing ? { opacity: 0, x: 20 } : { opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-3 bg-card rounded-xl border border-border/60 px-4 py-3 min-h-[52px] overflow-hidden relative"
                    >
                      {areaColor && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
                          style={{ backgroundColor: areaColor }}
                        />
                      )}
                      <button
                        onPointerDown={(e) => { e.stopPropagation(); handleQuickComplete(i.id); }}
                        className={`w-6 h-6 rounded-full border-2 flex-shrink-0 ml-1 flex items-center justify-center transition-all duration-300 active:scale-90 ${
                          completing
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border/60 hover:border-primary/60"
                        }`}
                        aria-label="Mark done"
                      >
                        {completing && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                      </button>
                      <span className="text-base text-foreground font-medium leading-snug line-clamp-2">{i.text}</span>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* CTA */}
            <Button
              onClick={() => setTriageStarted(true)}
              className="h-16 text-xl rounded-2xl shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all w-full flex-shrink-0"
            >
              Let's go →
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary mb-8 shadow-inner">
              <Sparkles className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-display font-bold mb-3">You're all caught up.</h1>
            <p className="text-muted-foreground text-lg">Nothing waiting in your inbox.</p>
          </div>
        )}
      </div>
    );
  }

  // ─── Shared choice button ─────────────────────────────────────────────────
  const ChoiceBtn = ({ onClick, children, hint }: { onClick: () => void; children: React.ReactNode; hint?: string }) => (
    <Button
      variant="outline"
      onClick={onClick}
      className="w-full min-h-[72px] h-auto text-xl font-medium justify-start px-6 py-4 rounded-2xl bg-card hover:bg-primary/5 hover:border-primary/50 transition-all shadow-sm active:scale-[0.98] flex flex-col items-start gap-0.5"
    >
      <span>{children}</span>
      {hint && <span className="text-sm text-muted-foreground font-normal">{hint}</span>}
    </Button>
  );

  // Step counter for progress dots — map subStep to visual step number
  const STEP_MAP: Record<SubStep, number> = {
    'type': 1, 'multistep-check': 1, 'suggest-project': 1,
    'area': 2,
    'next-action': 3,
    'timing': 4, 'waiting-check': 4, 'waiting-who': 4,
    'action-primary': 5, 'action-secondary': 5, 'schedule-when': 5, 'project-which': 5,
  };
  const TOTAL_STEPS = 5;
  const currentStep = STEP_MAP[subStep];

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col p-6 max-w-[430px] mx-auto shadow-2xl overflow-y-auto">
      {/* Progress dots + skip */}
      <div className="flex justify-between items-center mb-8 mt-4 flex-shrink-0">
        <div className="flex gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${
                currentStep > i ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
        <button
          onClick={resetTriage}
          className="text-muted-foreground font-semibold px-4 py-2 min-h-[48px] hover:text-foreground active:scale-95 transition-all"
        >
          Skip for now
        </button>
      </div>

      {/* Item text */}
      <motion.h2
        key={item.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-display font-bold text-foreground mb-10 leading-tight flex-shrink-0"
      >
        "{item.text}"
      </motion.h2>

      <AnimatePresence mode="wait">
        {/* Step 1 — What kind of thing? */}
        {subStep === 'type' && (
          <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
            <p className="text-xl font-semibold text-muted-foreground mb-2">What kind of thing is this?</p>
            {TYPE_CHOICES.map(({ label, hint, value }) => (
              <ChoiceBtn key={value} hint={hint} onClick={() => handleType(value)}>{label}</ChoiceBtn>
            ))}
          </motion.div>
        )}

        {/* Step 1b — Multi-step check */}
        {subStep === 'multistep-check' && (
          <motion.div key="multistep" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
            <p className="text-xl font-semibold text-muted-foreground mb-2">Quick check — does this take more than one step?</p>
            {MULTISTEP_CHOICES.map(({ id, label }) => (
              <ChoiceBtn key={id} onClick={() => handleMultistep(id)}>{label}</ChoiceBtn>
            ))}
          </motion.div>
        )}

        {/* Step 1c — Suggest converting to project */}
        {subStep === 'suggest-project' && (
          <motion.div key="suggest" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
            <p className="text-xl font-semibold text-muted-foreground mb-2">This sounds like a project — want to make it one?</p>
            <ChoiceBtn onClick={() => handleSuggestProject('yes')}>Yes — turn it into a project</ChoiceBtn>
            <ChoiceBtn onClick={() => handleSuggestProject('no')}>No — keep it as a task</ChoiceBtn>
            <ChoiceBtn onClick={() => setSubStep('type')}>← Start over</ChoiceBtn>
          </motion.div>
        )}

        {/* Step 2 — Area of life */}
        {subStep === 'area' && (
          <motion.div key="area" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
            <p className="text-xl font-semibold text-muted-foreground mb-2">What area of life does this belong to?</p>
            {AREA_CHOICES.map(({ label, value }) => (
              <ChoiceBtn key={value} onClick={() => handleArea(value)}>
                <AREA_CHOICE_DOT value={value} />
                {label}
              </ChoiceBtn>
            ))}
          </motion.div>
        )}

        {/* Step 3 — Next visible action (only for tasks & projects) */}
        {subStep === 'next-action' && (
          <motion.div key="next-action" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
            <p className="text-xl font-semibold text-muted-foreground mb-2">
              {draft.type === 'project'
                ? "What's the very first step for this project?"
                : "What's the next visible action to take?"}
            </p>
            <p className="text-sm text-muted-foreground -mt-1 mb-2">
              Be specific — what would you actually do?
            </p>
            <textarea
              value={nextActionText}
              onChange={(e) => setNextActionText(e.target.value)}
              placeholder={draft.type === 'project' ? "e.g. Open a blank doc and write an outline" : "e.g. Call the dentist at 9am"}
              className="w-full text-xl bg-card border border-border/60 rounded-2xl p-5 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none font-medium"
              rows={3}
              autoFocus
            />
            <Button
              size="lg"
              onClick={handleNextActionSubmit}
              className="h-16 text-xl rounded-2xl shadow-md shadow-primary/20"
            >
              {nextActionText.trim() ? 'Got it →' : 'Skip for now →'}
            </Button>
            {draft.type === 'project' && nextActionText.trim() && (
              <button
                onClick={handleConvertToProject}
                className="min-h-[48px] py-3 text-base font-semibold text-primary hover:text-primary/80 transition-colors text-center active:scale-95"
              >
                Create as a full project in Projects →
              </button>
            )}
          </motion.div>
        )}

        {/* Step 4 — When does this need to happen? */}
        {subStep === 'timing' && (
          <motion.div key="timing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
            <p className="text-xl font-semibold text-muted-foreground mb-2">When does this need to happen?</p>
            {TIMING_CHOICES.map(({ label, value }) => (
              <ChoiceBtn key={value} onClick={() => handleTiming(value)}>{label}</ChoiceBtn>
            ))}
          </motion.div>
        )}

        {/* Step 4b — Waiting on check (tasks only) */}
        {subStep === 'waiting-check' && (
          <motion.div key="waiting-check" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
            <p className="text-xl font-semibold text-muted-foreground mb-2">Are you waiting on someone else to do something first?</p>
            <ChoiceBtn onClick={() => setSubStep('waiting-who')}>Yes — I'm waiting on someone</ChoiceBtn>
            <ChoiceBtn onClick={() => setSubStep('action-primary')}>No — it's all on me</ChoiceBtn>
            <ChoiceBtn onClick={() => setSubStep('action-primary')}>Skip this</ChoiceBtn>
          </motion.div>
        )}

        {/* Step 4c — Who are you waiting on? */}
        {subStep === 'waiting-who' && (
          <motion.div key="waiting-who" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
            <p className="text-xl font-semibold text-muted-foreground mb-2">Who are you waiting on?</p>
            <input
              value={waitingText}
              onChange={(e) => setWaitingText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleWaitingWho(); }}
              placeholder="e.g. Principal Garcia, my manager…"
              className="w-full h-[64px] text-xl bg-card border border-border/60 rounded-2xl px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
              autoFocus
            />
            <Button size="lg" onClick={handleWaitingWho} className="h-16 text-xl rounded-2xl shadow-md shadow-primary/20">
              {waitingText.trim() ? 'Got it →' : 'Skip →'}
            </Button>
          </motion.div>
        )}

        {/* Step 5 — What to do with it? (primary 3 actions) */}
        {subStep === 'action-primary' && (
          <motion.div key="action-primary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
            <p className="text-xl font-semibold text-muted-foreground mb-2">What do you want to do with it?</p>
            {ACTION_PRIMARY.map(({ id, label }) => (
              <ChoiceBtn key={id} onClick={() => handleActionPrimary(id)}>{label}</ChoiceBtn>
            ))}
            <button
              onClick={() => setSubStep('action-secondary')}
              className="min-h-[48px] py-3 text-base font-semibold text-muted-foreground hover:text-foreground transition-colors text-center active:scale-95"
            >
              Not yet or toss it →
            </button>
          </motion.div>
        )}

        {/* Step 5b — Secondary actions */}
        {subStep === 'action-secondary' && (
          <motion.div key="action-secondary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
            <p className="text-xl font-semibold text-muted-foreground mb-2">What do you want to do with it?</p>
            {ACTION_SECONDARY.map(({ id, label }) => (
              <ChoiceBtn key={id} onClick={() => handleActionSecondary(id)}>{label}</ChoiceBtn>
            ))}
          </motion.div>
        )}

        {/* Step 5c — Schedule when? */}
        {subStep === 'schedule-when' && (
          <motion.div key="schedule-when" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
            <p className="text-xl font-semibold text-muted-foreground mb-2">When should this happen?</p>
            {SCHEDULE_CHOICES.map(({ label, daysAhead }) => (
              <ChoiceBtn key={label} onClick={() => handleSchedule(daysAhead)}>{label}</ChoiceBtn>
            ))}
            <button
              onClick={() => setSubStep('action-primary')}
              className="min-h-[48px] py-3 text-base font-semibold text-muted-foreground hover:text-foreground transition-colors text-center active:scale-95"
            >
              ← Back
            </button>
          </motion.div>
        )}

        {/* Step 5d — Which project? */}
        {subStep === 'project-which' && (
          <motion.div key="project-which" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
            <p className="text-xl font-semibold text-muted-foreground mb-2">Which project?</p>
            {projects.slice(0, 3).map((p: Project) => (
              <ChoiceBtn key={p.id} onClick={() => handleProjectAssign(p)}>{p.title}</ChoiceBtn>
            ))}
            <button
              onClick={() => setSubStep('action-primary')}
              className="min-h-[48px] py-3 text-base font-semibold text-muted-foreground hover:text-foreground transition-colors text-center active:scale-95"
            >
              ← Back
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
