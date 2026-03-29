import { AreaOfLife } from "@/lib/types";
import { AREA_COLOR, AREA_LABEL } from "@/lib/colors";

export type AreaFilter = AreaOfLife | null;

const AREAS: AreaOfLife[] = ['work', 'home', 'family', 'personal'];

interface Props {
  value: AreaFilter;
  onChange: (v: AreaFilter) => void;
}

export function AreaFilterBar({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar" role="group" aria-label="Filter by area">
      <FilterPill
        active={value === null}
        color="hsl(var(--primary))"
        onClick={() => onChange(null)}
      >
        All
      </FilterPill>
      {AREAS.map((area) => (
        <FilterPill
          key={area}
          active={value === area}
          color={AREA_COLOR[area]}
          onClick={() => onChange(value === area ? null : area)}
        >
          {AREA_LABEL[area]}
        </FilterPill>
      ))}
    </div>
  );
}

function FilterPill({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all min-h-[36px] border"
      style={
        active
          ? {
              backgroundColor: color + '1a',
              color,
              borderColor: color + '55',
            }
          : {
              backgroundColor: 'transparent',
              borderColor: 'transparent',
              color: 'var(--color-muted-foreground)',
            }
      }
    >
      {children}
    </button>
  );
}
