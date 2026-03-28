import { useState } from "react";
import { useAppData } from "@/lib/useAppData";
import { Button } from "@/components/ui/button";
import { InboxIcon, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CapturedItem } from "@/lib/types";

export default function Inbox() {
  const { items, projects, updateItem } = useAppData();
  const untriaged = items.filter((i: CapturedItem) => !i.isTriaged && !i.isDeleted);
  
  const [triageStarted, setTriageStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Partial<CapturedItem>>({});
  const [pickingProject, setPickingProject] = useState(false);

  const item = untriaged[index];

  const resetTriage = () => {
    setTriageStarted(false);
    setIndex(0);
    setStep(1);
    setDraft({});
    setPickingProject(false);
  };

  const nextStep = (updates: Partial<CapturedItem>) => {
    setDraft(prev => ({ ...prev, ...updates }));
    setStep(s => s + 1);
  };

  const finishTriage = (updates: Partial<CapturedItem>) => {
    updateItem(item.id, { ...draft, ...updates, isTriaged: true });
    setDraft({});
    setStep(1);
    setPickingProject(false);
    
    if (index + 1 >= untriaged.length) {
      resetTriage();
    } else {
      setIndex(i => i + 1);
    }
  };

  if (!triageStarted || !item) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary mb-8 shadow-inner">
          {untriaged.length > 0 ? <InboxIcon className="w-12 h-12" /> : <Sparkles className="w-12 h-12" />}
        </div>
        
        {untriaged.length > 0 ? (
          <>
            <h1 className="text-3xl font-display font-bold mb-3">You have {untriaged.length} things to sort</h1>
            <p className="text-muted-foreground text-lg mb-12">Take a breath. We'll do this one at a time.</p>
            <Button 
              onClick={() => setTriageStarted(true)}
              className="h-16 px-12 text-xl rounded-2xl shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all"
            >
              Let's go →
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-display font-bold mb-3">You're all caught up.</h1>
            <p className="text-muted-foreground text-lg">Nothing waiting in your inbox.</p>
          </>
        )}
      </div>
    );
  }

  const ChoiceBtn = ({ onClick, children }: { onClick: () => void, children: React.ReactNode }) => (
    <Button 
      variant="outline" 
      onClick={onClick}
      className="w-full h-[72px] text-xl font-medium justify-start px-6 rounded-2xl bg-card hover:bg-primary/5 hover:border-primary/50 transition-all shadow-sm active:scale-[0.98]"
    >
      {children}
    </Button>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col p-6 animate-in slide-in-from-bottom-8 fade-in duration-300 max-w-[430px] mx-auto shadow-2xl">
      <div className="flex justify-between items-center mb-8 mt-4">
        <div className="flex gap-2">
          {[1,2,3,4].map(i => (
             <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${step >= i ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>
        <button onClick={resetTriage} className="text-muted-foreground font-semibold px-4 py-2 hover:text-foreground active:scale-95 transition-all">
          Skip for now
        </button>
      </div>

      <div className="flex-1 flex flex-col w-full mx-auto">
        <motion.h2 
          key={item.id}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-12 leading-tight"
        >
          "{item.text}"
        </motion.h2>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
              <p className="text-xl font-semibold text-muted-foreground mb-6">What kind of thing is this?</p>
              <div className="flex flex-col gap-4">
                <ChoiceBtn onClick={() => nextStep({ type: 'task' })}>Something to do</ChoiceBtn>
                <ChoiceBtn onClick={() => nextStep({ type: 'project' })}>A project</ChoiceBtn>
                <ChoiceBtn onClick={() => nextStep({ type: 'event' })}>An event</ChoiceBtn>
                <ChoiceBtn onClick={() => nextStep({ type: 'note' })}>Just a note</ChoiceBtn>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
              <p className="text-xl font-semibold text-muted-foreground mb-6">What part of life?</p>
              <div className="flex flex-col gap-4">
                <ChoiceBtn onClick={() => nextStep({ area: 'work' })}>Work</ChoiceBtn>
                <ChoiceBtn onClick={() => nextStep({ area: 'home' })}>Home</ChoiceBtn>
                <ChoiceBtn onClick={() => nextStep({ area: 'family' })}>Family</ChoiceBtn>
                <ChoiceBtn onClick={() => nextStep({ area: 'personal' })}>Personal</ChoiceBtn>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
              <p className="text-xl font-semibold text-muted-foreground mb-6">When does it matter?</p>
              <div className="flex flex-col gap-4">
                <ChoiceBtn onClick={() => nextStep({ timing: 'today' })}>Today</ChoiceBtn>
                <ChoiceBtn onClick={() => nextStep({ timing: 'this-week' })}>This week</ChoiceBtn>
                <ChoiceBtn onClick={() => nextStep({ timing: 'later' })}>Not yet</ChoiceBtn>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col h-full">
              {!pickingProject ? (
                <>
                  <p className="text-xl font-semibold text-muted-foreground mb-6">What to do with it?</p>
                  <div className="flex flex-col gap-4 overflow-y-auto pb-8 no-scrollbar">
                    <ChoiceBtn onClick={() => finishTriage({ timing: 'today', isPriority: false })}>Do it today ✓</ChoiceBtn>
                    <ChoiceBtn onClick={() => finishTriage({ timing: 'this-week' })}>Schedule it 📅</ChoiceBtn>
                    <ChoiceBtn onClick={() => setPickingProject(true)}>Add to a project 📁</ChoiceBtn>
                    <ChoiceBtn onClick={() => finishTriage({ timing: 'later' })}>Not yet 💤</ChoiceBtn>
                    <ChoiceBtn onClick={() => finishTriage({ isDeleted: true })}>Toss it 🗑</ChoiceBtn>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xl font-semibold text-muted-foreground mb-6">Which project?</p>
                  <div className="flex flex-col gap-4 overflow-y-auto pb-8 no-scrollbar">
                    {projects.map((p: any) => (
                      <ChoiceBtn key={p.id} onClick={() => finishTriage({ projectId: p.id })}>
                        {p.title}
                      </ChoiceBtn>
                    ))}
                    {projects.length === 0 && <p className="text-muted-foreground p-4">No projects yet.</p>}
                    <Button variant="ghost" className="h-16 text-lg mt-4" onClick={() => setPickingProject(false)}>← Back</Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
