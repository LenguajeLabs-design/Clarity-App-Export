import { useState } from "react";
import { useAppData } from "@/lib/useAppData";
import { Button } from "@/components/ui/button";
import { Project, AreaOfLife, ProjectStatus } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { AREA_COLOR, AREA_LABEL } from "@/lib/colors";

type ProjectDraft = Omit<Project, 'id' | 'createdAt'>;

const DEFAULT_DRAFT: ProjectDraft = {
  title: '',
  area: 'work',
  nextAction: '',
  status: 'not-started',
  dueDate: null,
};

const AREAS: { value: AreaOfLife; label: string }[] = [
  { value: 'work',     label: 'Work' },
  { value: 'home',     label: 'Home' },
  { value: 'family',   label: 'Family' },
  { value: 'personal', label: 'Personal' },
];

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'not-started', label: 'Not started' },
  { value: 'in-progress', label: 'Active' },
  { value: 'done',        label: 'Done' },
];

const STATUS_DOT: Record<ProjectStatus, string> = {
  'not-started': 'bg-muted-foreground/30',
  'in-progress': 'bg-primary/70',
  'done':        'bg-muted-foreground/50',
};

export default function Projects() {
  const { projects, addProject, updateProject } = useAppData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProjectDraft>(DEFAULT_DRAFT);

  const activeProjects = projects.filter((p: Project) => p.status !== 'done');
  const doneProjects   = projects.filter((p: Project) => p.status === 'done');

  const openNew  = () => { setDraft(DEFAULT_DRAFT); setEditingId('new'); };
  const openEdit = (p: Project) => {
    setDraft({ title: p.title, area: p.area, nextAction: p.nextAction, status: p.status, dueDate: p.dueDate });
    setEditingId(p.id);
  };

  const handleSave = () => {
    if (!draft.title.trim()) return;
    if (editingId === 'new') addProject(draft);
    else if (editingId) updateProject(editingId, draft);
    setEditingId(null);
  };

  const ProjectCard = ({ p }: { p: Project }) => {
    const areaColor = AREA_COLOR[p.area] ?? "#7A8599";
    const missingNextAction = !p.nextAction.trim();
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={() => openEdit(p)}
        className="bg-card rounded-[2rem] shadow-sm border border-border/60 cursor-pointer hover:shadow-md hover:border-border transition-all overflow-hidden"
      >
        {/* Thin top accent colored by area */}
        <div className="h-[3px] w-full" style={{ backgroundColor: areaColor }} />

        <div className="p-6">
          {/* Area label — small dot + text, no full background */}
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: areaColor }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: areaColor }}>
              {AREA_LABEL[p.area] ?? p.area}
            </span>
          </div>

          <h3 className="text-2xl font-display font-bold mb-4 text-foreground leading-tight">{p.title}</h3>

          {/* Next action row — amber warning when empty, plain card otherwise */}
          <div
            className={`flex items-start gap-3 p-4 rounded-2xl transition-colors ${
              missingNextAction
                ? 'bg-amber-50 border border-amber-200/70'
                : 'bg-muted/40'
            }`}
          >
            {missingNextAction ? (
              <div className="w-2.5 h-2.5 rounded-full mt-[5px] flex-shrink-0 bg-amber-400" />
            ) : (
              <div className={`w-2.5 h-2.5 rounded-full mt-[5px] flex-shrink-0 ${STATUS_DOT[p.status]}`} />
            )}
            <p
              className={`text-base leading-snug font-medium ${
                missingNextAction ? 'text-amber-700' : 'text-foreground/85'
              }`}
            >
              {missingNextAction ? 'Needs a next step — tap to add one' : p.nextAction}
            </p>
          </div>

          {p.dueDate && (
            <p className="text-sm text-muted-foreground mt-3 pl-1">
              Due {format(parseISO(p.dueDate), 'MMM d')}
            </p>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-8">
        <h1 className="text-4xl font-display font-bold text-foreground">Projects</h1>
        <Button onClick={openNew} size="icon" className="rounded-2xl h-12 w-12 shadow-sm hover:shadow-md transition-all">
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {activeProjects.length === 0 && doneProjects.length === 0 ? (
        <p className="text-muted-foreground text-lg text-center mt-12">No projects yet.</p>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {activeProjects.map((p: Project) => <ProjectCard key={p.id} p={p} />)}
          </div>
          {doneProjects.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 pl-1">Done</h2>
              <div className="flex flex-col gap-4 opacity-50">
                {doneProjects.map((p: Project) => <ProjectCard key={p.id} p={p} />)}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={!!editingId} onOpenChange={(o) => { if (!o) setEditingId(null); }}>
        <DialogContent className="max-w-md w-[92vw] rounded-[2rem] p-6 bg-card">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-display font-bold">
              {editingId === 'new' ? 'New project' : 'Edit project'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5">
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Project name..."
              className="text-xl font-medium p-4 bg-background border border-border/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              value={draft.nextAction}
              onChange={(e) => setDraft({ ...draft, nextAction: e.target.value })}
              placeholder="Next step to take..."
              className="text-lg p-4 bg-background border border-border/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />

            {/* Area selector — dot + label, scrollable row */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
              {AREAS.map(({ value, label }) => {
                const color = AREA_COLOR[value];
                const isSelected = draft.area === value;
                return (
                  <button
                    key={value}
                    onClick={() => setDraft({ ...draft, area: value })}
                    className={`flex-shrink-0 min-h-[48px] px-4 text-sm font-semibold rounded-2xl transition-all border flex items-center gap-1.5 whitespace-nowrap ${
                      isSelected
                        ? 'bg-background border-border text-foreground shadow-sm'
                        : 'bg-background text-muted-foreground border-border/40 hover:border-border/70'
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color, opacity: isSelected ? 1 : 0.4 }}
                    />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Status selector */}
            <div className="flex gap-2 p-1 bg-muted/40 rounded-2xl">
              {STATUSES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setDraft({ ...draft, status: value })}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                    draft.status === value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <Button
              size="lg"
              className="h-16 text-xl rounded-2xl mt-2 shadow-md shadow-primary/20"
              onClick={handleSave}
              disabled={!draft.title.trim()}
            >
              Save project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
