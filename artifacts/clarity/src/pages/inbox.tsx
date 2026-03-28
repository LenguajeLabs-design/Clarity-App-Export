import { useState } from "react";
import { useAppData } from "@/lib/useAppData";
import { Button } from "@/components/ui/button";
import { InboxIcon, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CapturedItem, ItemType, AreaOfLife, Timing, Project } from "@/lib/types";
import { format, addDays } from "date-fns";

// — Step definitions —————————————————————————————————
// Each step shows exactly 3 choices (max 3 visible at once, ADHD-friendly constraint)

const TYPE_CHOICES: { label: string; value: ItemType }[] = [
  { label: "Something to do", value: "task" },
  { label: "A project", value: "project" },
  { label: "An event or note", value: "note" },
];

const AREA_CHOICES: { label: string; value: AreaOfLife }[] = [
  { label: "Work", value: "work" },
  { label: "Family", value: "family" },
  { label: "Home or personal", value: "home" },
];

// Step 3a — first 3 action choices
const ACTION_PRIMARY: { label: string; id: string }[] = [
  { id: "today",   label: "Do it today ✓" },
  { id: "schedule",label: "Schedule it 📅" },
  { id: "more",    label: "Other options →" },
];

// Step 3b — second set of 3 choices (revealed when "Other options" tapped)
const ACTION_SECONDARY: { label: string; id: string }[] = [
  { id: "project", label: "Add to a project 📂" },
  { id: "later",   label: "Not yet 💤" },
  { id: "delete",  label: "Toss it 🗑" },
];

// — Triage draft state —————————————————————————————————
interface TriageDraft {
  type?: ItemType;
  area?: AreaOfLife;
  timing?: Timing;
}

type SubStep = 'action-primary' | 'action-secondary' | 'schedule-when' | 'project-which';

const SCHEDULE_CHOICES: { label: string; daysAhead: number }[] = [
  { label: "Tomorrow",    daysAhead: 1 },
  { label: "In 3 days",  daysAhead: 3 },
  { label: "Next week",  daysAhead: 7 },
];

export default function Inbox() {
  const { items, projects, updateItem } = useAppData();
  const untriaged = items.filter((i: CapturedItem) => !i.isTriaged && !i.isDeleted);

  const [triageStarted, setTriageStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [subStep, setSubStep] = useState<SubStep>('action-primary');
  const [draft, setDraft] = useState<TriageDraft>({});

  const item = untriaged[index];

  const resetTriage = () => {
    setTriageStarted(false);
    setIndex(0);
    setStep(1);
    setSubStep('action-primary');
    setDraft({});
  };

  const advanceStep = (updates: Partial<TriageDraft>) => {
    const next = { ...draft, ...updates };
    setDraft(next);
    if (step === 1) setStep(2);
    else if (step === 2) {
      setStep(3);
      setSubStep('action-primary');
    }
  };

  const finishTriage = (actionUpdates: Partial<CapturedItem>) => {
    updateItem(item.id, {
      type: draft.type ?? "task",
      area: draft.area ?? "work",
      timing: draft.timing ?? "later",
      ...actionUpdates,
      isTriaged: true,
    });
    setDraft({});
    setStep(1);
    setSubStep('action-primary');
    if (index + 1 >= untriaged.length) {
      resetTriage();
    } else {
      setIndex((i) => i + 1);
    }
  };

  // — "What to do?" action handler —————————————————————
  const handleActionPrimary = (id: string) => {
    if (id === 'today') {
      finishTriage({ timing: 'today', scheduledDate: format(new Date(), 'yyyy-MM-dd') });
    } else if (id === 'schedule') {
      setSubStep('schedule-when');
    } else if (id === 'more') {
      setSubStep('action-secondary');
    }
  };

  const handleActionSecondary = (id: string) => {
    if (id === 'project') {
      setSubStep('project-which');
    } else if (id === 'later') {
      finishTriage({ timing: 'later' });
    } else if (id === 'delete') {
      finishTriage({ isDeleted: true });
    }
  };

  const handleSchedule = (daysAhead: number) => {
    const date = addDays(new Date(), daysAhead);
    finishTriage({
      timing: daysAhead <= 1 ? 'today' : daysAhead <= 3 ? 'this-week' : 'this-week',
      scheduledDate: format(date, 'yyyy-MM-dd'),
    });
  };

  const handleProjectAssign = (project: Project) => {
    finishTriage({ projectId: project.id, type: 'task', timing: 'this-week' });
  };

  // — Landing screen ————————————————————————————————————
  if (!triageStarted || !item) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary mb-8 shadow-inner">
          {untriaged.length > 0
            ? <InboxIcon className="w-12 h-12" />
            : <Sparkles className="w-12 h-12" />
          }
        </div>

        {untriaged.length > 0 ? (
          <>
            <h1 className="text-3xl font-display font-bold mb-3">
              You have {untriaged.length} {untriaged.length === 1 ? "thing" : "things"} to sort
            </h1>
            <p className="text-muted-foreground text-lg mb-12">
              Take a breath. We'll do this one at a time.
            </p>
            <Button
              onClick={() => setTriageStarted(true)}
              className="h-16 px-12 text-xl rounded-2xl shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all"
            >
              Let's go →
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-display font-bold mb-3">You're all caught up.</h1>
            <p className="text-muted-foreground text-lg">Nothing waiting in your inbox.</p>
          </>
        )}
      </div>
    );
  }

  // — Shared choice button ———————————————————————————————
  const ChoiceBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <Button
      variant="outline"
      onClick={onClick}
      className="w-full h-[72px] text-xl font-medium justify-start px-6 rounded-2xl bg-card hover:bg-primary/5 hover:border-primary/50 transition-all shadow-sm active:scale-[0.98]"
    >
      {children}
    </Button>
  );

  // Step progress: steps 1 / 2 / 3 (step 3 has sub-steps but counts as one progress dot)
  const TOTAL_STEPS = 3;

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col p-6 max-w-[430px] mx-auto shadow-2xl">
      {/* Progress dots + skip */}
      <div className="flex justify-between items-center mb-8 mt-4">
        <div className="flex gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${
                step > i ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
        <button
          onClick={resetTriage}
          className="text-muted-foreground font-semibold px-4 py-2 hover:text-foreground active:scale-95 transition-all"
        >
          Skip for now
        </button>
      </div>

      {/* Item text */}
      <motion.h2
        key={item.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-display font-bold text-foreground mb-10 leading-tight"
      >
        "{item.text}"
      </motion.h2>

      <AnimatePresence mode="wait">
        {/* Step 1 — What kind of thing? (3 choices) */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <p className="text-xl font-semibold text-muted-foreground mb-6">What kind of thing is this?</p>
            <div className="flex flex-col gap-4">
              {TYPE_CHOICES.map(({ label, value }) => (
                <ChoiceBtn key={value} onClick={() => advanceStep({ type: value })}>
                  {label}
                </ChoiceBtn>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2 — What area of life? (3 choices) */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <p className="text-xl font-semibold text-muted-foreground mb-6">What part of life?</p>
            <div className="flex flex-col gap-4">
              {AREA_CHOICES.map(({ label, value }) => (
                <ChoiceBtn key={value} onClick={() => advanceStep({ area: value })}>
                  {label}
                </ChoiceBtn>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 3a — Primary actions: Do it today / Schedule it / Other options (3 choices) */}
        {step === 3 && subStep === 'action-primary' && (
          <motion.div
            key="step3a"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <p className="text-xl font-semibold text-muted-foreground mb-6">What do you want to do with it?</p>
            <div className="flex flex-col gap-4">
              {ACTION_PRIMARY.map(({ id, label }) => (
                <ChoiceBtn key={id} onClick={() => handleActionPrimary(id)}>
                  {label}
                </ChoiceBtn>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 3b — Secondary actions: Add to a project / Not yet / Toss it (3 choices) */}
        {step === 3 && subStep === 'action-secondary' && (
          <motion.div
            key="step3b"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <p className="text-xl font-semibold text-muted-foreground mb-6">What do you want to do with it?</p>
            <div className="flex flex-col gap-4">
              {ACTION_SECONDARY.map(({ id, label }) => (
                <ChoiceBtn key={id} onClick={() => handleActionSecondary(id)}>
                  {label}
                </ChoiceBtn>
              ))}
            </div>
            <button
              onClick={() => setSubStep('action-primary')}
              className="mt-6 text-muted-foreground font-semibold text-lg hover:text-foreground transition-colors py-3 text-center active:scale-95"
            >
              ← Back
            </button>
          </motion.div>
        )}

        {/* Step 3c — Schedule when? Tomorrow / In 3 days / Next week (3 choices) */}
        {step === 3 && subStep === 'schedule-when' && (
          <motion.div
            key="step3c"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <p className="text-xl font-semibold text-muted-foreground mb-6">When should this happen?</p>
            <div className="flex flex-col gap-4">
              {SCHEDULE_CHOICES.map(({ label, daysAhead }) => (
                <ChoiceBtn key={label} onClick={() => handleSchedule(daysAhead)}>
                  {label}
                </ChoiceBtn>
              ))}
            </div>
            <button
              onClick={() => setSubStep('action-primary')}
              className="mt-6 text-muted-foreground font-semibold text-lg hover:text-foreground transition-colors py-3 text-center active:scale-95"
            >
              ← Back
            </button>
          </motion.div>
        )}

        {/* Step 3d — Which project? (show up to 3 projects, then remainder) */}
        {step === 3 && subStep === 'project-which' && (
          <motion.div
            key="step3d"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <p className="text-xl font-semibold text-muted-foreground mb-6">Which project?</p>
            <div className="flex flex-col gap-4">
              {projects.slice(0, 3).map((p: Project) => (
                <ChoiceBtn key={p.id} onClick={() => handleProjectAssign(p)}>
                  {p.title}
                </ChoiceBtn>
              ))}
            </div>
            <button
              onClick={() => setSubStep('action-secondary')}
              className="mt-6 text-muted-foreground font-semibold text-lg hover:text-foreground transition-colors py-3 text-center active:scale-95"
            >
              ← Back
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
