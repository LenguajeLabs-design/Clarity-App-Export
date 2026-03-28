import { CapturedItem } from "@/lib/types";
import { useAppData } from "@/lib/useAppData";
import { motion } from "framer-motion";

export function ItemRow({ item }: { item: CapturedItem }) {
  const { completeItem } = useAppData();

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="flex items-center min-h-[64px] bg-card p-4 rounded-2xl shadow-sm border border-border/60 hover:shadow-md hover:border-border active:scale-[0.98] transition-all group"
    >
      <button
        onClick={() => completeItem(item.id)}
        aria-label="Mark as done"
        className="w-8 h-8 rounded-full border-2 border-primary/40 flex items-center justify-center mr-4 flex-shrink-0 hover:bg-primary/10 hover:border-primary transition-colors focus:outline-none focus:ring-4 focus:ring-primary/10"
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
      <span className="text-lg text-foreground font-medium leading-tight">{item.text}</span>
    </motion.div>
  );
}
