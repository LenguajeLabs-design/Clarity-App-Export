import { useState } from "react";
import { useAppData } from "@/lib/useAppData";
import { Button } from "@/components/ui/button";
import { InboxIcon, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CapturedItem, ItemType, AreaOfLife, Timing } from "@/lib/types";

// Each triage step shows exactly 3 choices
const TYPE_CHOICES: { label: string; value: ItemType | 'note' }[] = [
  { label: "Something to do", value: "task" },
  { label: "A project", value: "project" },
  { label: "An event or note", value: "note" },
];

const AREA_CHOICES: { label: string; value: AreaOfLife }[] = [
  { label: "Work", value: "work" },
  { label: "Family", value: "family" },
  { label: "Home or personal", value: "home" },
];

const TIMING_CHOICES: { label: string; value: Timing }[] = [
  { label: "Today", value: "today" },
  { label: "This week", value: "this-week" },
  { label: "Not yet", value: "later" },
];

const ACTION_CHOICES: { label: string; updates: Partial<CapturedItem> }[] = [
  { label: "Do it today ✓", updates: { timing: "today", isPriority: false } },
  { label: "Not yet 💤", updates: { timing: "later" } },
  { label: "Toss it 🗑", updates: { isDeleted: true } },
];

interface TriageDraft {
  type?: ItemType;
  area?: AreaOfLife;
  timing?: Timing;
}

export default function Inbox() {
  const { items, updateItem } = useAppData();
  const untriaged = items.filter((i: CapturedItem) => !i.isTriaged && !i.isDeleted);

  const [triageStarted, setTriageStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<TriageDraft>({});

  const item = untriaged[index];

  const resetTriage = () => {
    setTriageStarted(false);
    setIndex(0);
    setStep(1);
    setDraft({});
  };

  const nextStep = (updates: Partial<TriageDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
    setStep((s) => s + 1);
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

    if (index + 1 >= untriaged.length) {
      resetTriage();
    } else {
      setIndex((i) => i + 1);
    }
  };

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

  // 3-dot progress indicator
  const TOTAL_STEPS = 4;

  const ChoiceBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <Button
      variant="outline"
      onClick={onClick}
      className="w-full h-[72px] text-xl font-medium justify-start px-6 rounded-2xl bg-card hover:bg-primary/5 hover:border-primary/50 transition-all shadow-sm active:scale-[0.98]"
    >
      {children}
    </Button>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col p-6 max-w-[430px] mx-auto shadow-2xl">
      {/* Header */}
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
            <p className="text-xl font-semibold text-muted-foreground mb-6">
              What kind of thing is this?
            </p>
            <div className="flex flex-col gap-4">
              {TYPE_CHOICES.map(({ label, value }) => (
                <ChoiceBtn key={value} onClick={() => nextStep({ type: value as ItemType })}>
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
            <p className="text-xl font-semibold text-muted-foreground mb-6">
              What part of life?
            </p>
            <div className="flex flex-col gap-4">
              {AREA_CHOICES.map(({ label, value }) => (
                <ChoiceBtn key={value} onClick={() => nextStep({ area: value })}>
                  {label}
                </ChoiceBtn>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 3 — When does it matter? (3 choices) */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <p className="text-xl font-semibold text-muted-foreground mb-6">
              When does it matter?
            </p>
            <div className="flex flex-col gap-4">
              {TIMING_CHOICES.map(({ label, value }) => (
                <ChoiceBtn key={value} onClick={() => nextStep({ timing: value })}>
                  {label}
                </ChoiceBtn>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 4 — What to do with it? (3 choices) */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <p className="text-xl font-semibold text-muted-foreground mb-6">
              What to do with it?
            </p>
            <div className="flex flex-col gap-4">
              {ACTION_CHOICES.map(({ label, updates }) => (
                <ChoiceBtn key={label} onClick={() => finishTriage(updates)}>
                  {label}
                </ChoiceBtn>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
