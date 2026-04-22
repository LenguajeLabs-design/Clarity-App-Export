import { useMemo } from "react";
import { useAppData } from "@/lib/useAppData";
import { CapturedItem } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCheck, RotateCcw, ClipboardList } from "lucide-react";
import { AREA_COLOR } from "@/lib/colors";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString([], { weekday: 'short' }).slice(0, 3);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── Weekly mini bar chart ────────────────────────────────────────────────────

function WeeklyTimeline({ items }: { items: CapturedItem[] }) {
  const days = useMemo(() => {
    const result = [];
    const today = startOfDay(new Date());
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const count = items.filter((item) => {
        if (!item.completedAt) return false;
        return sameDay(new Date(item.completedAt), d);
      }).length;
      result.push({ date: d, label: dayLabel(d), count, isToday: i === 0 });
    }
    return result;
  }, [items]);

  const maxCount = Math.max(...days.map((d) => d.count), 1);

  return (
    <div className="flex items-end justify-between gap-1 h-14 px-1">
      {days.map((day, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div className="w-full flex items-end justify-center" style={{ height: 36 }}>
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3, ease: "easeOut" }}
              style={{ originY: 1, height: `${(day.count / maxCount) * 100}%` }}
              className={`w-full rounded-t-sm min-h-[3px] ${
                day.isToday ? "bg-primary" : "bg-muted-foreground/25"
              }`}
            />
          </div>
          <span
            className={`text-[10px] font-medium leading-none ${
              day.isToday ? "text-primary font-bold" : "text-muted-foreground/60"
            }`}
          >
            {day.label}
          </span>
          {day.count > 0 && (
            <span className="text-[9px] text-muted-foreground/50 leading-none">{day.count}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Single completed task row ────────────────────────────────────────────────

function DoneRow({ item, onRestore }: { item: CapturedItem; onRestore: () => void }) {
  const areaColor = item.area ? AREA_COLOR[item.area] : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden"
    >
      <div
        className="w-[3px] self-stretch flex-shrink-0"
        style={{ backgroundColor: areaColor ?? "transparent" }}
      />
      <div className="flex items-start flex-1 px-3 py-3 gap-3 min-w-0">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <CheckCheck className="w-3 h-3 text-primary/60" />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-base font-medium text-foreground/70 leading-snug line-through decoration-foreground/25">
            {item.text}
          </p>
          {item.completedAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Done at {formatTime(item.completedAt)}
            </p>
          )}
        </div>
        <button
          onClick={onRestore}
          aria-label="Restore task"
          title="Restore"
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/8 transition-all mt-0.5"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Section heading ─────────────────────────────────────────────────────────

function SectionHead({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3 pl-1">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</h2>
      <span className="text-xs text-muted-foreground/40">{count}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Done() {
  const { items, uncompleteItem } = useAppData();
  const { toast } = useToast();

  const completed = useMemo(
    () =>
      items
        .filter((i) => i.isCompleted && !i.isDeleted)
        .sort((a, b) => {
          const aT = a.completedAt ?? a.createdAt;
          const bT = b.completedAt ?? b.createdAt;
          return bT.localeCompare(aT);
        }),
    [items],
  );

  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const todayItems = completed.filter((i) => {
    const d = new Date(i.completedAt ?? i.createdAt);
    return sameDay(d, now);
  });

  const yesterdayItems = completed.filter((i) => {
    const d = new Date(i.completedAt ?? i.createdAt);
    return sameDay(d, yesterdayStart);
  });

  const thisWeekItems = completed.filter((i) => {
    const d = new Date(i.completedAt ?? i.createdAt);
    return d >= weekStart && !sameDay(d, now) && !sameDay(d, yesterdayStart);
  });

  const olderItems = completed.filter((i) => {
    const d = new Date(i.completedAt ?? i.createdAt);
    return d < weekStart;
  });

  const handleRestore = (item: CapturedItem) => {
    uncompleteItem(item.id);
    toast({ description: `"${item.text.slice(0, 40)}${item.text.length > 40 ? '…' : ''}" moved back to Today.` });
  };

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <h1 className="text-4xl font-display font-bold text-foreground mb-1">Done</h1>

      {/* Summary */}
      <p className="text-muted-foreground text-base mb-6">
        {todayItems.length === 0
          ? "Nothing completed today yet — go get one!"
          : todayItems.length === 1
          ? "You completed 1 task today. Keep going!"
          : `You completed ${todayItems.length} tasks today. Great work!`}
      </p>

      {/* Weekly bar chart */}
      {completed.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm px-4 pt-4 pb-3 mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Past 7 days
          </p>
          <WeeklyTimeline items={completed} />
        </div>
      )}

      {/* Empty state */}
      {completed.length === 0 && (
        <div className="flex flex-col items-center justify-center mt-20 text-center opacity-50">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <ClipboardList className="w-9 h-9 text-muted-foreground" />
          </div>
          <p className="text-2xl font-medium font-display leading-tight text-foreground">
            Nothing done yet.<br />Complete your first task!
          </p>
        </div>
      )}

      {/* Today */}
      <AnimatePresence>
        {todayItems.length > 0 && (
          <motion.div key="today" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
            <SectionHead label="Today" count={todayItems.length} />
            <div className="flex flex-col gap-2">
              {todayItems.map((i) => (
                <DoneRow key={i.id} item={i} onRestore={() => handleRestore(i)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Yesterday */}
        {yesterdayItems.length > 0 && (
          <motion.div key="yesterday" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
            <SectionHead label="Yesterday" count={yesterdayItems.length} />
            <div className="flex flex-col gap-2">
              {yesterdayItems.map((i) => (
                <DoneRow key={i.id} item={i} onRestore={() => handleRestore(i)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* This week */}
        {thisWeekItems.length > 0 && (
          <motion.div key="week" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
            <SectionHead label="This Week" count={thisWeekItems.length} />
            <div className="flex flex-col gap-2">
              {thisWeekItems.map((i) => (
                <DoneRow key={i.id} item={i} onRestore={() => handleRestore(i)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Older */}
        {olderItems.length > 0 && (
          <motion.div key="older" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
            <SectionHead label="Older" count={olderItems.length} />
            <div className="flex flex-col gap-2">
              {olderItems.map((i) => (
                <DoneRow key={i.id} item={i} onRestore={() => handleRestore(i)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
