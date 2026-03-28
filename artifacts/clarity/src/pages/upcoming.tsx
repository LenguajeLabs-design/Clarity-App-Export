import { useAppData } from "@/lib/useAppData";
import { ItemRow } from "@/components/item-row";
import { CapturedItem } from "@/lib/types";
import { format, isToday, isTomorrow, parseISO, isThisWeek, isAfter, startOfDay } from "date-fns";

interface DayGroup {
  label: string;
  date: string | null;
  items: CapturedItem[];
}

function groupByDay(items: CapturedItem[]): DayGroup[] {
  const today = startOfDay(new Date());

  // Items with a specific scheduled date
  const dated = items.filter((i) => i.scheduledDate !== null);
  // Items without a specific date (just timing-based)
  const undated = items.filter((i) => i.scheduledDate === null);

  // Group dated items by day
  const dayMap = new Map<string, CapturedItem[]>();
  for (const item of dated) {
    const dateKey = item.scheduledDate!;
    if (!dayMap.has(dateKey)) dayMap.set(dateKey, []);
    dayMap.get(dateKey)!.push(item);
  }

  // Sort date keys ascending, skip past dates
  const sortedDates = Array.from(dayMap.keys())
    .filter((d) => !isAfter(today, startOfDay(parseISO(d))))
    .sort();

  const groups: DayGroup[] = sortedDates.map((dateStr) => {
    const date = parseISO(dateStr);
    let label: string;
    if (isToday(date)) {
      label = "Today";
    } else if (isTomorrow(date)) {
      label = "Tomorrow";
    } else if (isThisWeek(date, { weekStartsOn: 1 })) {
      label = format(date, "EEEE"); // e.g. "Wednesday"
    } else {
      label = format(date, "MMMM d"); // e.g. "April 10"
    }
    return { label, date: dateStr, items: dayMap.get(dateStr)! };
  });

  // Add undated items as a "Later" group
  if (undated.length > 0) {
    groups.push({ label: "Later on", date: null, items: undated });
  }

  return groups;
}

export default function Upcoming() {
  const { items } = useAppData();

  const upcomingItems = items.filter(
    (i: CapturedItem) =>
      i.isTriaged &&
      !i.isDeleted &&
      !i.isCompleted &&
      (i.timing === "this-week" || i.timing === "later")
  );

  const groups = groupByDay(upcomingItems);

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <h1 className="text-4xl font-display font-bold mb-10 text-foreground">Upcoming</h1>

      {groups.length === 0 ? (
        <div className="text-center mt-20">
          <p className="text-xl text-muted-foreground font-medium">
            Nothing coming up right now.
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.label} className="mb-10">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 pl-1">
              {group.label}
            </h2>
            <div className="flex flex-col gap-3">
              {group.items.map((i: CapturedItem) => (
                <ItemRow key={i.id} item={i} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
