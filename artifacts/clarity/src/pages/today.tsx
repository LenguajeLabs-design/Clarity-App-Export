import { useState } from "react";
import { useAppData } from "@/lib/useAppData";
import { ItemRow } from "@/components/item-row";
import { AreaFilterBar, AreaFilter } from "@/components/area-filter-bar";
import { Sun, Star, Zap } from "lucide-react";
import { CapturedItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { AREA_COLOR } from "@/lib/colors";

const WAITING_COLOR = "#C07A3A";

// ─── Start Here card — full-width prominent display of the #1 priority ────────
function StartHereCard({ item, onComplete }: { item: CapturedItem; onComplete: () => void }) {
  const areaColor = item.area ? AREA_COLOR[item.area] : undefined;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-card rounded-2xl border-2 border-primary/25 shadow-md overflow-hidden"
    >
      {/* Area accent strip */}
      {areaColor && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: areaColor }} />
      )}
      <div className="px-5 pt-4 pb-1 pl-6">
        <div className="flex items-center gap-1.5 mb-3">
          <Star className="w-3.5 h-3.5 text-primary/70 fill-primary/20" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary/70">Start here</span>
        </div>
      </div>
      <div className="flex items-start gap-4 px-5 pb-5 pl-6">
        <button
          onClick={onComplete}
          aria-label="Mark as done"
          className="w-12 h-12 rounded-full border-2 border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5 hover:border-primary hover:bg-primary/5 transition-colors focus:outline-none focus:ring-4 focus:ring-primary/10 group"
        >
          <svg className="w-4 h-4 text-primary opacity-40 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-semibold text-foreground leading-snug">{item.text}</p>
          {item.nextAction && (
            <p className="text-sm text-muted-foreground mt-1.5 truncate">Next: {item.nextAction}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Today() {
  const { items, updateItem, completeItem } = useAppData();
  const [pickingPriorities, setPickingPriorities] = useState(false);
  const [areaFilter, setAreaFilter] = useState<AreaFilter>(null);

  const allTriaged = items.filter(
    (i: CapturedItem) => i.isTriaged && !i.isDeleted && !i.isCompleted
  );

  // Area filter applies to display sections only; priority picker uses allTriaged
  const todayItems = areaFilter
    ? allTriaged.filter((i: CapturedItem) => i.area === areaFilter)
    : allTriaged;

  const priorities   = todayItems.filter((i: CapturedItem) => i.isPriority);
  const waitingOn    = todayItems.filter((i: CapturedItem) => i.waitingOn && !i.isPriority);
  const rest         = todayItems.filter((i: CapturedItem) => !i.isPriority && !i.waitingOn);
  const quickWins    = rest.filter((i: CapturedItem) => i.isQuickWin);
  const everythingElse = rest.filter((i: CapturedItem) => !i.isQuickWin);
  const priorityCount  = allTriaged.filter((i: CapturedItem) => i.isPriority).length;

  const startHereItem   = priorities[0] ?? null;
  const remainingPriorities = priorities.slice(1);

  const togglePriority = (item: CapturedItem) => {
    if (item.isPriority) {
      updateItem(item.id, { isPriority: false });
    } else if (priorityCount < 3) {
      updateItem(item.id, { isPriority: true });
    }
  };

  const toggleQuickWin = (id: string, current: boolean) => {
    updateItem(id, { isQuickWin: !current });
  };

  const allEmpty = todayItems.length === 0;

  // ─── Priority picker full-screen ─────────────────────────────────────────
  if (pickingPriorities) {
    const pickable  = todayItems.filter((i: CapturedItem) => !i.isCompleted);
    const selected  = pickable.filter((i: CapturedItem) => i.isPriority);
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
            const disabled   = !isSelected && priorityCount >= 3;
            const areaColor  = i.area ? AREA_COLOR[i.area] : undefined;
            return (
              <motion.button
                key={i.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => !disabled && togglePriority(i)}
                className={`w-full text-left flex items-start gap-4 p-5 rounded-2xl border-2 transition-all min-h-[72px] overflow-hidden relative ${
                  isSelected
                    ? 'border-primary/50 bg-card shadow-md'
                    : disabled
                    ? 'border-border/30 bg-card opacity-35 cursor-default'
                    : 'border-border/60 bg-card hover:border-border cursor-pointer'
                }`}
              >
                {/* Area accent strip */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
                  style={{ backgroundColor: isSelected && areaColor ? areaColor : 'transparent' }}
                />
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    isSelected ? 'border-primary bg-primary' : 'border-border/60'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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

  // ─── Main Today view ──────────────────────────────────────────────────────
  return (
    <div className="p-6 animate-in fade-in duration-500">
      <div className="flex items-end justify-between mb-4">
        <h1 className="text-4xl font-display font-bold text-foreground">Today</h1>
        <button
          onClick={() => setPickingPriorities(true)}
          className="flex items-center gap-2 text-primary font-bold text-base px-4 py-3 min-h-[48px] rounded-2xl hover:bg-primary/5 active:scale-95 transition-all"
        >
          <Star className="w-4 h-4" />
          Pick top 3
        </button>
      </div>

      <div className="mb-8">
        <AreaFilterBar value={areaFilter} onChange={setAreaFilter} />
      </div>

      {allEmpty && (
        <div className="flex flex-col items-center justify-center mt-24 text-center opacity-60">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-8">
            <Sun className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-2xl font-medium font-display leading-tight text-foreground">
            Nothing here yet.<br />A clear day is a good day.
          </p>
        </div>
      )}

      <AnimatePresence>
        {/* ── Start Here — the single most important thing ── */}
        {startHereItem && (
          <motion.div key="start-here" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10">
            <StartHereCard
              item={startHereItem}
              onComplete={() => completeItem(startHereItem.id)}
            />
          </motion.div>
        )}

        {/* ── Top priorities — 2nd and 3rd ── */}
        {remainingPriorities.length > 0 && (
          <motion.div key="priorities" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10">
            <div className="flex items-center gap-2 mb-4 pl-1">
              <Star className="w-3.5 h-3.5 text-primary/70" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Top priorities</h2>
            </div>
            <div className="flex flex-col gap-3">
              {remainingPriorities.map((i: CapturedItem) => <ItemRow key={i.id} item={i} />)}
            </div>
          </motion.div>
        )}

        {/* ── Quick Wins — fast tasks ── */}
        {quickWins.length > 0 && (
          <motion.div key="quick-wins" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10">
            <div className="flex items-center gap-2 mb-4 pl-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick wins</h2>
            </div>
            <div className="flex flex-col gap-3">
              {quickWins.map((i: CapturedItem) => (
                <ItemRow
                  key={i.id}
                  item={i}
                  onMarkQuickWin={() => toggleQuickWin(i.id, i.isQuickWin)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Waiting on ── */}
        {waitingOn.length > 0 && (
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 pl-1">Waiting on</h2>
            <div className="flex flex-col gap-3">
              {waitingOn.map((i: CapturedItem) => (
                <div
                  key={i.id}
                  className="flex items-start gap-4 bg-card p-5 rounded-2xl border border-border/60 shadow-sm min-h-[72px] overflow-hidden relative"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl" style={{ backgroundColor: WAITING_COLOR }} />
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-base"
                    style={{ backgroundColor: `rgba(192,122,58,0.10)`, color: WAITING_COLOR }}
                  >
                    ⏳
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

        {/* ── Everything else — tap ⚡ to flag as quick win ── */}
        {everythingElse.length > 0 && (
          <motion.div key="rest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10">
            <div className="flex items-center justify-between mb-4 pl-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Everything else</h2>
              <span className="text-xs text-muted-foreground/50">Tap ⚡ to mark quick win</span>
            </div>
            <div className="flex flex-col gap-3">
              {everythingElse.map((i: CapturedItem) => (
                <ItemRow
                  key={i.id}
                  item={i}
                  onMarkQuickWin={() => toggleQuickWin(i.id, i.isQuickWin)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
