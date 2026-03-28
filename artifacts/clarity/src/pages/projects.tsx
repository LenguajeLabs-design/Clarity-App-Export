import { useState } from "react";
import { useAppData } from "@/lib/useAppData";
import { Button } from "@/components/ui/button";
import { Project, AreaOfLife, ProjectStatus } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";

type ProjectDraft = Omit<Project, 'id' | 'createdAt'>;

const DEFAULT_DRAFT: ProjectDraft = {
  title: '',
  area: 'work',
  nextAction: '',
  status: 'not-started',
  dueDate: null,
};

const AREAS: { value: AreaOfLife; label: string }[] = [
  { value: 'work', label: 'Work' },
  { value: 'home', label: 'Home' },
  { value: 'family', label: 'Family' },
  { value: 'personal', label: 'Personal' },
];

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'not-started', label: 'Not started' },
  { value: 'in-progress', label: 'Active' },
  { value: 'done', label: 'Done' },
];

const STATUS_DOT: Record<ProjectStatus, string> = {
  'not-started': 'bg-muted-foreground/40',
  'in-progress': 'bg-primary',
  'done': 'bg-green-500',
};

export default function Projects() {
  const { projects, addProject, updateProject } = useAppData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProjectDraft>(DEFAULT_DRAFT);

  const activeProjects = projects.filter((p: Project) => p.status !== 'done');
  const doneProjects = projects.filter((p: Project) => p.status === 'done');

  const openNew = () => {
    setDraft(DEFAULT_DRAFT);
    setEditingId('new');
  };

  const openEdit = (p: Project) => {
    setDraft({
      title: p.title,
      area: p.area,
      nextAction: p.nextAction,
      status: p.status,
      dueDate: p.dueDate,
    });
    setEditingId(p.id);
  };

  const handleSave = () => {
    if (!draft.title.trim()) return;
    if (editingId === 'new') {
      addProject(draft);
    } else if (editingId) {
      updateProject(editingId, draft);
    }
    setEditingId(null);
  };

  const ProjectCard = ({ p }: { p: Project }) => (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => openEdit(p)}
      className="bg-card p-6 rounded-[2rem] shadow-sm border border-border/60 cursor-pointer hover:shadow-md hover:border-border transition-all"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">{p.area}</p>
      <h3 className="text-2xl font-display font-bold mb-4 text-foreground leading-tight">{p.title}</h3>
      <div className="flex items-start gap-3 bg-accent/30 p-4 rounded-2xl">
        <div className={`w-3.5 h-3.5 rounded-full mt-1 flex-shrink-0 ${STATUS_DOT[p.status]}`} />
        <p className="text-lg text-foreground/90 leading-snug font-medium">
          Next: {p.nextAction || 'Nothing set yet'}
        </p>
      </div>
      {p.dueDate && (
        <p className="text-sm text-muted-foreground mt-3 pl-1">
          Due {format(parseISO(p.dueDate), 'MMM d')}
        </p>
      )}
    </motion.div>
  );

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-8">
        <h1 className="text-4xl font-display font-bold text-foreground">Projects</h1>
        <Button onClick={openNew} size="icon" className="rounded-2xl h-12 w-12 shadow-md hover:shadow-lg transition-all">
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
              <div className="flex flex-col gap-4 opacity-60">
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
            {/* Area selector — shown as a scrollable single row so only ~3 are visible at a time */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
              {AREAS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setDraft({ ...draft, area: value })}
                  className={`flex-shrink-0 min-h-[48px] px-5 text-sm font-bold rounded-2xl transition-all border whitespace-nowrap ${
                    draft.area === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border/50 hover:border-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Status selector — 3 options in one row */}
            <div className="flex gap-2 p-1 bg-accent/30 rounded-2xl">
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
              className="h-16 text-xl rounded-2xl mt-2 shadow-lg shadow-primary/20"
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
