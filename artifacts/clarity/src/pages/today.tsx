import { useState } from "react";
import { useAppData } from "@/lib/useAppData";
import { ItemRow } from "@/components/item-row";
import { Sun, Star } from "lucide-react";
import { CapturedItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function Today() {
  const { items, updateItem } = useAppData();
  const [pickingPriorities, setPickingPriorities] = useState(false);

  const todayItems = items.filter(
    (i: CapturedItem) => i.isTriaged && !i.isDeleted && !i.isCompleted
  );

  const priorities = todayItems.filter((i: CapturedItem) => i.isPriority);
  const waitingOn = todayItems.filter((i: CapturedItem) => i.waitingOn);
  const rest = todayItems.filter((i: CapturedItem) => !i.isPriority && !i.waitingOn);

  const priorityCount = priorities.length;

  const togglePriority = (item: CapturedItem) => {
    if (item.isPriority) {
      updateItem(item.id, { isPriority: false });
    } else if (priorityCount < 3) {
      updateItem(item.id, { isPriority: true });
    }
  };

  const allEmpty = todayItems.length === 0;

  // ─── Priority picker modal ───────────────────────────────────────────────
  if (pickingPriorities) {
    const pickable = todayItems.filter((i: CapturedItem) => !i.isCompleted);
    const selected = pickable.filter((i: CapturedItem) => i.isPriority);
    const remaining = 3 - selected.length;

    return (
      <div className="fixed inset-0 z-[60] bg-background flex flex-col p-6 max-w-[430px] mx-auto shadow-2xl overflow-y-auto">
        <div className="flex-shrink-0 mb-8 mt-4">
          <h2 className="text-3xl font-display font-bold mb-2">Pick your top 3</h2>
          <p className="text-muted-foreground text-lg">
            {remaining > 0
              ? `Choose ${remaining} more thing${remaining !== 1 ? 's' : ''} that matter most today`
              : "You've picked your 3 — that's plenty."}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-3 pb-4">
          {pickable.map((i: CapturedItem) => {
            const isSelected = i.isPriority;
            const disabled = !isSelected && priorityCount >= 3;
            return (
              <motion.button
                key={i.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => !disabled && togglePriority(i)}
                className={`w-full text-left flex items-start gap-4 p-5 rounded-2xl border-2 transition-all min-h-[72px] ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md'
                    : disabled
                    ? 'border-border/40 bg-card opacity-40 cursor-default'
                    : 'border-border/60 bg-card hover:border-border cursor-pointer'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    isSelected ? 'border-primary bg-primary' : 'border-border/80'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-medium leading-snug">{i.text}</p>
                  {i.nextAction && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">Next: {i.nextAction}</p>
                  )}
                </div>
              </motion.button>
            );
          })}
          {pickable.length === 0 && (
            <p className="text-center text-muted-foreground text-lg py-10">Nothing to pick from yet.</p>
          )}
        </div>

        <div className="pt-4 flex-shrink-0">
          <Button
            size="lg"
            onClick={() => setPickingPriorities(false)}
            className="h-16 text-xl rounded-2xl w-full shadow-lg shadow-primary/20"
          >
            Done — show my day
          </Button>
        </div>
      </div>
    );
  }

  // ─── Main Today view ─────────────────────────────────────────────────────
  return (
    <div className="p-6 animate-in fade-in duration-500">
      <div className="flex items-end justify-between mb-10">
        <h1 className="text-4xl font-display font-bold text-foreground">Today</h1>
        <button
          onClick={() => setPickingPriorities(true)}
          className="flex items-center gap-2 text-primary font-bold text-base px-4 py-3 min-h-[48px] rounded-2xl hover:bg-primary/5 active:scale-95 transition-all"
        >
          <Star className="w-4 h-4" />
          Pick top 3
        </button>
      </div>

      {allEmpty && (
        <div className="flex flex-col items-center justify-center mt-24 text-center opacity-70">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-8">
            <Sun className="w-12 h-12 text-primary" />
          </div>
          <p className="text-2xl font-medium font-display leading-tight text-foreground">
            Nothing here yet.<br />A clear day is a good day.
          </p>
        </div>
      )}

      <AnimatePresence>
        {priorities.length > 0 && (
          <motion.div key="priorities" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10">
            <div className="flex items-center gap-2 mb-4 pl-1">
              <Star className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Top 3 priorities</h2>
            </div>
            <div className="flex flex-col gap-3">
              {priorities.map((i: CapturedItem) => <ItemRow key={i.id} item={i} />)}
            </div>
          </motion.div>
        )}

        {waitingOn.length > 0 && (
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 pl-1">
              Waiting on
            </h2>
            <div className="flex flex-col gap-3">
              {waitingOn.map((i: CapturedItem) => (
                <div
                  key={i.id}
                  className="flex items-start gap-4 bg-card p-5 rounded-2xl border border-border/60 shadow-sm min-h-[72px]"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-amber-400/60 bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-500 font-bold text-lg">⏳</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-medium leading-snug">{i.text}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Waiting on <span className="font-semibold text-foreground/70">{i.waitingOn}</span>
                    </p>
                    {i.nextAction && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">Next: {i.nextAction}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {rest.length > 0 && (
          <motion.div key="rest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 pl-1">Everything else</h2>
            <div className="flex flex-col gap-3">
              {rest.map((i: CapturedItem) => <ItemRow key={i.id} item={i} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
