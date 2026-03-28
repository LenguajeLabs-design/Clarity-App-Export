import { CapturedItem } from "@/lib/types";
import { useAppData } from "@/lib/useAppData";
import { motion } from "framer-motion";
import { AREA_COLOR } from "@/lib/colors";

export function ItemRow({ item }: { item: CapturedItem }) {
  const { completeItem } = useAppData();

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

      <div className="flex items-center flex-1 px-4 py-3">
        <button
          onClick={() => completeItem(item.id)}
          aria-label="Mark as done"
          className="w-12 h-12 rounded-full border-2 border-border flex items-center justify-center mr-3 flex-shrink-0 hover:border-primary/60 hover:bg-primary/5 transition-colors focus:outline-none focus:ring-4 focus:ring-primary/10"
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

        <div className="flex-1 min-w-0">
          <span className="text-lg text-foreground font-medium leading-tight block">{item.text}</span>
          {item.nextAction && (
            <span className="text-sm text-muted-foreground mt-0.5 block truncate">
              Next: {item.nextAction}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
