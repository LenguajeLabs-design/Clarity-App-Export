import { CapturedItem } from "@/lib/types";
import { useAppData } from "@/lib/useAppData";
import { motion } from "framer-motion";
import { AREA_COLOR } from "@/lib/colors";
import { Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ItemRowProps {
  item: CapturedItem;
  // When provided, renders a ⚡ quick-win toggle button on the right
  onMarkQuickWin?: () => void;
}

export function ItemRow({ item, onMarkQuickWin }: ItemRowProps) {
  const { completeItem, uncompleteItem } = useAppData();
  const { toast } = useToast();

  const handleComplete = () => {
    completeItem(item.id);
    toast({
      description: "Task done! Nice work.",
      action: (
        <button
          onClick={() => uncompleteItem(item.id)}
          className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          Undo
        </button>
      ),
      duration: 4000,
    });
  };

  const areaColor = item.area ? AREA_COLOR[item.area] : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="flex items-center min-h-[64px] bg-card rounded-2xl shadow-sm border border-border/60 hover:shadow-md hover:border-border active:scale-[0.98] transition-all group overflow-hidden"
    >
      {/* Small left accent — 3px strip colored by area */}
      <div
        className="w-[3px] self-stretch flex-shrink-0"
        style={{ backgroundColor: areaColor ?? "transparent" }}
      />

      <div className="flex items-start flex-1 px-4 py-3 gap-2">
        <button
          onClick={handleComplete}
          aria-label="Mark as done"
          className="w-12 h-12 rounded-full border-2 border-border flex items-center justify-center flex-shrink-0 mt-0.5 hover:border-primary/60 hover:bg-primary/5 transition-colors focus:outline-none focus:ring-4 focus:ring-primary/10"
        >
          <svg
            className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        <div className="flex-1 min-w-0 py-1 overflow-hidden">
          <span className="text-lg text-foreground font-medium leading-tight block">{item.text}</span>
          {item.nextAction && (
            <span className="text-sm text-muted-foreground mt-0.5 block truncate">
              Next: {item.nextAction}
            </span>
          )}
        </div>

        {/* Quick-win toggle — only rendered when the caller opts in */}
        {onMarkQuickWin && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkQuickWin(); }}
            aria-label={item.isQuickWin ? "Remove quick win" : "Mark as quick win"}
            title={item.isQuickWin ? "Remove quick win" : "Quick win"}
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all mt-0.5 ${
              item.isQuickWin
                ? "text-amber-500 bg-amber-50 dark:bg-amber-950/40"
                : "text-muted-foreground/55 hover:text-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-950/30"
            }`}
          >
            <Zap className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
