import { useState } from 'react';
import { useAppData } from '@/lib/useAppData';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { InboxIcon, Check } from 'lucide-react';
import { Project, CapturedItem } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

export default function Review() {
  const { items, projects, updateItem, updateProject } = useAppData();
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  
  const untriaged = items.filter((i: CapturedItem) => !i.isTriaged && !i.isDeleted).length;
  const activeProjects = projects.filter((p: Project) => p.status !== 'done');
  const thisWeekItems = items.filter((i: CapturedItem) => i.isTriaged && !i.isDeleted && !i.isCompleted && i.timing === 'this-week');

  const StepHeader = ({ title }: { title: string }) => (
    <div className="mb-8">
      <div className="flex gap-2 mb-8">
        {[1,2,3,4].map(i => <div key={i} className={`h-2.5 flex-1 rounded-full transition-colors duration-500 ${step >= i ? 'bg-primary' : 'bg-border'}`} />)}
      </div>
      <h1 className="text-4xl font-display font-bold leading-tight">{title}</h1>
    </div>
  );

  return (
    <div className="p-6 h-full flex flex-col">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
            <StepHeader title="Let's check your inbox" />
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner">
                <InboxIcon className="w-12 h-12 text-primary" />
              </div>
              <p className="text-3xl font-display font-bold mb-4">{untriaged > 0 ? `You have ${untriaged} things to sort` : "Your inbox is clear!"}</p>
              <p className="text-xl text-muted-foreground">A clear inbox means a clear mind.</p>
            </div>
            <div className="flex flex-col gap-3 mt-auto pt-8">
              {untriaged > 0 && (
                <Button variant="outline" className="h-16 text-xl rounded-2xl w-full border-border/80" onClick={() => setLocation('/inbox')}>
                  Go sort them
                </Button>
              )}
              <Button className="h-16 text-xl rounded-2xl w-full shadow-lg shadow-primary/20" onClick={() => setStep(2)}>
                Next →
              </Button>
            </div>
          </motion.div>
        )}
        
        {step === 2 && (
          <motion.div key="2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col h-full">
            <StepHeader title="How are your projects going?" />
            <div className="flex-1 overflow-y-auto no-scrollbar pb-4 flex flex-col gap-4">
              {activeProjects.map((p: Project) => (
                 <div key={p.id} className="bg-card p-6 rounded-[2rem] shadow-sm border border-border/60">
                   <h3 className="font-display font-bold text-2xl mb-2">{p.title}</h3>
                   <p className="text-muted-foreground text-lg mb-6">Next: {p.nextAction}</p>
                   <div className="flex gap-2 p-1 bg-accent/30 rounded-2xl">
                     <button className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${p.status === 'not-started' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`} onClick={() => updateProject(p.id, {status: 'not-started'})}>Not Started</button>
                     <button className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${p.status === 'in-progress' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`} onClick={() => updateProject(p.id, {status: 'in-progress'})}>Active</button>
                     <button className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${p.status === 'done' ? 'bg-green-500 shadow-sm text-white' : 'text-muted-foreground'}`} onClick={() => updateProject(p.id, {status: 'done'})}>Done</button>
                   </div>
                 </div>
              ))}
              {activeProjects.length === 0 && <p className="text-center text-muted-foreground text-lg py-10">No active projects.</p>}
            </div>
            <div className="pt-6">
              <Button className="h-16 text-xl rounded-2xl w-full shadow-lg shadow-primary/20" onClick={() => setStep(3)}>Next →</Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col h-full">
            <StepHeader title="Pick priorities for next week" />
            <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
              <p className="text-xl text-muted-foreground mb-8">Tap up to 3 things to focus on.</p>
              {thisWeekItems.map((i: CapturedItem) => (
                <div 
                  key={i.id} 
                  onClick={() => updateItem(i.id, { isPriority: !i.isPriority })}
                  className={`p-5 rounded-2xl mb-4 border-2 cursor-pointer transition-all active:scale-[0.98] ${i.isPriority ? 'border-primary bg-primary/5 shadow-md' : 'border-border/60 bg-card hover:border-border'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${i.isPriority ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border/80'}`}>
                      {i.isPriority && <Check className="w-5 h-5" strokeWidth={3} />}
                    </div>
                    <span className="font-medium text-xl leading-tight">{i.text}</span>
                  </div>
                </div>
              ))}
              {thisWeekItems.length === 0 && <p className="text-center text-muted-foreground text-lg py-10">Nothing scheduled for this week.</p>}
            </div>
            <div className="pt-6">
              <Button className="h-16 text-xl rounded-2xl w-full shadow-lg shadow-primary/20" onClick={() => setLocation('/today')}>Finish Review 🎉</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
