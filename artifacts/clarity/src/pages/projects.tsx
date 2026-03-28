import { useState } from "react";
import { useAppData } from "@/lib/useAppData";
import { Button } from "@/components/ui/button";
import { Project } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function Projects() {
  const { projects, addProject, updateProject } = useAppData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Project>>({ title: '', area: 'work', nextAction: '', status: 'not-started' });

  const activeProjects = projects.filter((p: Project) => p.status !== 'done');
  
  const openNew = () => {
    setDraft({ title: '', area: 'work', nextAction: '', status: 'not-started' });
    setEditingId('new');
  };

  const openEdit = (p: Project) => {
    setDraft(p);
    setEditingId(p.id);
  };

  const handleSave = () => {
    if (!draft.title?.trim()) return;
    if (editingId === 'new') {
      addProject(draft as any);
    } else if (editingId) {
      updateProject(editingId, draft);
    }
    setEditingId(null);
  };

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-8">
        <h1 className="text-4xl font-display font-bold text-foreground">Projects</h1>
        <Button onClick={openNew} size="icon" className="rounded-2xl h-12 w-12 shadow-md hover:shadow-lg transition-all">
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {activeProjects.length === 0 ? (
           <p className="text-muted-foreground text-lg text-center mt-12">No active projects.</p>
        ) : (
          activeProjects.map((p: Project) => (
            <motion.div 
              key={p.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => openEdit(p)}
              className="bg-card p-6 rounded-[2rem] shadow-sm border border-border/60 cursor-pointer hover:shadow-md hover:border-border transition-all"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">{p.area}</p>
              <h3 className="text-2xl font-display font-bold mb-4 text-foreground leading-tight">{p.title}</h3>
              <div className="flex items-start gap-3 bg-accent/30 p-4 rounded-2xl">
                <div className={`w-3.5 h-3.5 rounded-full mt-1 flex-shrink-0 ${p.status === 'not-started' ? 'bg-muted-foreground/40' : p.status === 'in-progress' ? 'bg-primary' : 'bg-green-500'}`} />
                <p className="text-lg text-foreground/90 leading-snug font-medium">Next: {p.nextAction || 'None'}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <Dialog open={!!editingId} onOpenChange={(o) => !o && setEditingId(null)}>
        <DialogContent className="max-w-md w-[92vw] rounded-[2rem] p-6 top-[50%] translate-y-[-50%] bg-card">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-display font-bold">{editingId === 'new' ? 'New Project' : 'Edit Project'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5">
            <input 
              value={draft.title || ''}
              onChange={e => setDraft({...draft, title: e.target.value})}
              placeholder="Project title..."
              className="text-xl font-medium p-4 bg-background border border-border/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input 
              value={draft.nextAction || ''}
              onChange={e => setDraft({...draft, nextAction: e.target.value})}
              placeholder="Next specific action..."
              className="text-lg p-4 bg-background border border-border/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex gap-2 p-1 bg-accent/30 rounded-2xl">
               {['work', 'home', 'family', 'personal'].map(area => (
                 <button 
                   key={area}
                   onClick={() => setDraft({...draft, area: area as any})}
                   className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-all ${draft.area === area ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                 >
                   {area}
                 </button>
               ))}
            </div>
            <div className="flex gap-2 p-1 bg-accent/30 rounded-2xl">
               {[
                 { v: 'not-started', l: 'Not Started' }, 
                 { v: 'in-progress', l: 'In Progress' }, 
                 { v: 'done', l: 'Done' }
               ].map(s => (
                 <button 
                   key={s.v}
                   onClick={() => setDraft({...draft, status: s.v as any})}
                   className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${draft.status === s.v ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                 >
                   {s.l}
                 </button>
               ))}
            </div>
            <Button size="lg" className="h-16 text-xl rounded-2xl mt-4 shadow-lg shadow-primary/20" onClick={handleSave}>
              Save Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
