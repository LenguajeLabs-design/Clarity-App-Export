import { useAppData } from "@/lib/useAppData";
import { ItemRow } from "@/components/item-row";
import { Sun } from "lucide-react";
import { CapturedItem } from "@/lib/types";

export default function Today() {
  const { items } = useAppData();
  
  const todayItems = items.filter((i: CapturedItem) => i.isTriaged && !i.isDeleted && !i.isCompleted);
  
  const mostImportant = todayItems.filter((i: CapturedItem) => i.isPriority).slice(0, 3);
  const quickThings = todayItems.filter((i: CapturedItem) => i.isQuickWin && !mostImportant.includes(i));
  const scheduled = todayItems.filter((i: CapturedItem) => i.timing === 'today' && !mostImportant.includes(i) && !quickThings.includes(i));

  const allEmpty = mostImportant.length === 0 && quickThings.length === 0 && scheduled.length === 0;

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <h1 className="text-4xl font-display font-bold mb-10 text-foreground">Today</h1>
      
      {allEmpty && (
        <div className="flex flex-col items-center justify-center mt-32 text-center opacity-70">
           <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-8">
             <Sun className="w-12 h-12 text-primary" />
           </div>
           <p className="text-2xl font-medium font-display leading-tight text-foreground">Nothing here yet.<br/>A clear day is a good day.</p>
        </div>
      )}
      
      {mostImportant.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 pl-1">Most important</h2>
          <div className="flex flex-col gap-3">
            {mostImportant.map((i: CapturedItem) => <ItemRow key={i.id} item={i} />)}
          </div>
        </div>
      )}

      {quickThings.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 pl-1">Quick things</h2>
          <div className="flex flex-col gap-3">
            {quickThings.map((i: CapturedItem) => <ItemRow key={i.id} item={i} />)}
          </div>
        </div>
      )}

      {scheduled.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 pl-1">Scheduled today</h2>
          <div className="flex flex-col gap-3">
            {scheduled.map((i: CapturedItem) => <ItemRow key={i.id} item={i} />)}
          </div>
        </div>
      )}
    </div>
  )
}
