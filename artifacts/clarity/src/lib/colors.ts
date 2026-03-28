/**
 * Calm ADHD color system — use ONLY as small dots, left accents, or tag borders.
 * Never apply these as full card/row backgrounds.
 */

export const AREA_COLOR: Record<string, string> = {
  work:     "#4A7CB4", // soft blue
  home:     "#4E9070", // muted green
  family:   "#7B6AAF", // soft purple
  personal: "#7A8599", // neutral gray-blue
};

export const AREA_BG: Record<string, string> = {
  work:     "rgba(74,124,180,0.10)",
  home:     "rgba(78,144,112,0.10)",
  family:   "rgba(123,106,175,0.10)",
  personal: "rgba(122,133,153,0.10)",
};

export const AREA_LABEL: Record<string, string> = {
  work: "Work",
  home: "Home",
  family: "Family",
  personal: "Personal",
};

export const TIMING_COLOR: Record<string, string> = {
  today:      "#C07A3A", // muted amber — urgent but not alarming
  "this-week": "#7A8599", // neutral gray
  later:      "#A8B0BD", // light gray
};

export const TIMING_BG: Record<string, string> = {
  today:      "rgba(192,122,58,0.10)",
  "this-week": "rgba(122,133,153,0.10)",
  later:      "rgba(168,176,189,0.10)",
};

export const TIMING_LABEL: Record<string, string> = {
  today:      "Today",
  "this-week": "This week",
  later:      "Later",
};

export const TYPE_LABEL: Record<string, string> = {
  task:    "Task",
  project: "Project",
  event:   "Event",
  note:    "Note",
};
