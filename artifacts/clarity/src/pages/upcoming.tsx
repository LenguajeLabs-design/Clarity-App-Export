import { useAppData } from "@/lib/useAppData";
import { ItemRow } from "@/components/item-row";
import { CapturedItem } from "@/lib/types";

export default function Upcoming() {
  const { items } = useAppData();
  
  const upcoming = items.filter((i: CapturedItem) => i.isTriaged && !i.isDeleted && !i.isCompleted && (i.timing === 'this-week' || i.timing === 'later'));
  
  const thisWeek = upcoming.filter((i: CapturedItem) => i.timing === 'this-week');
  const later = upcoming.filter((i: CapturedItem) => i.timing === 'later');

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <h1 className="text-4xl font-display font-bold mb-10 text-foreground">Upcoming</h1>
      
      {thisWeek.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 pl-1">This Week</h2>
          <div className="flex flex-col gap-3">
            {thisWeek.map((i: CapturedItem) => <ItemRow key={i.id} item={i} />)}
          </div>
        </div>
      )}

      {later.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 pl-1">Later On</h2>
          <div className="flex flex-col gap-3">
            {later.map((i: CapturedItem) => <ItemRow key={i.id} item={i} />)}
          </div>
        </div>
      )}
      
      {upcoming.length === 0 && (
         <div className="text-center mt-20">
           <p className="text-xl text-muted-foreground font-medium">Nothing coming up right now.</p>
         </div>
      )}
    </div>
  )
}
