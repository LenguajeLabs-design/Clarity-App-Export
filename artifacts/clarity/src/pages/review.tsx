import { useState } from 'react';
import { useAppData } from '@/lib/useAppData';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { InboxIcon, Calendar } from 'lucide-react';
import { Project, CapturedItem } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isToday, isTomorrow, isThisWeek } from 'date-fns';

function friendlyDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = parseISO(dateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, "EEEE");
  return format(d, "MMM d");
}

export default function Review() {
  const { items, projects, updateItem, updateProject } = useAppData();
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();

  const TOTAL_STEPS = 4;

  const untriaged = items.filter((i: CapturedItem) => !i.isTriaged && !i.isDeleted).length;
  const activeProjects = projects.filter((p: Project) => p.status !== 'done');
  const upcomingItems = items.filter(
    (i: CapturedItem) => i.isTriaged && !i.isDeleted && !i.isCompleted &&
      (i.timing === 'this-week' || i.timing === 'later')
  ).slice(0, 6);
  const thisWeekItems = items.filter(
    (i: CapturedItem) => i.isTriaged && !i.isDeleted && !i.isCompleted && i.timing === 'this-week'
  );

  const StepBar = () => (
    <div className="flex gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-full transition-colors duration-500 ${
            step > i ? 'bg-primary' : 'bg-border'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="p-6 h-full flex flex-col">
      <AnimatePresence mode="wait">
        {/* Step 1 — Empty the inbox */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <StepBar />
            <h1 className="text-4xl font-display font-bold mb-10 leading-tight">
              Let's check your inbox
            </h1>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner">
                <InboxIcon className="w-12 h-12 text-primary" />
              </div>
              <p className="text-3xl font-display font-bold mb-4">
                {untriaged > 0 ? `You have ${untriaged} things to sort` : "Your inbox is clear!"}
              </p>
              <p className="text-xl text-muted-foreground">
                {untriaged > 0 ? "Let's deal with those before moving on." : "A clear inbox means a clear mind."}
              </p>
            </div>
            <div className="flex flex-col gap-3 mt-auto pt-8">
              {untriaged > 0 && (
                <Button
                  variant="outline"
                  className="h-16 text-xl rounded-2xl w-full border-border/80"
                  onClick={() => setLocation('/inbox')}
                >
                  Go sort them
                </Button>
              )}
              <Button
                className="h-16 text-xl rounded-2xl w-full shadow-lg shadow-primary/20"
                onClick={() => setStep(2)}
              >
                Next →
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2 — Check your projects */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col h-full"
          >
            <StepBar />
            <h1 className="text-4xl font-display font-bold mb-10 leading-tight">
              How are your projects going?
            </h1>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-4 flex flex-col gap-4">
              {activeProjects.map((p: Project) => (
                <div key={p.id} className="bg-card p-6 rounded-[2rem] shadow-sm border border-border/60">
                  <h3 className="font-display font-bold text-2xl mb-2">{p.title}</h3>
                  <p className="text-muted-foreground text-lg mb-6">Next: {p.nextAction}</p>
                  <div className="flex gap-2 p-1 bg-accent/30 rounded-2xl">
                    <button
                      className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${p.status === 'not-started' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                      onClick={() => updateProject(p.id, { status: 'not-started' })}
                    >
                      Not started
                    </button>
                    <button
                      className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${p.status === 'in-progress' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                      onClick={() => updateProject(p.id, { status: 'in-progress' })}
                    >
                      Active
                    </button>
                    <button
                      className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${p.status === 'done' ? 'bg-green-500 shadow-sm text-white' : 'text-muted-foreground'}`}
                      onClick={() => updateProject(p.id, { status: 'done' })}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ))}
              {activeProjects.length === 0 && (
                <p className="text-center text-muted-foreground text-lg py-10">
                  No active projects.
                </p>
              )}
            </div>
            <div className="pt-6 flex gap-3">
              <Button variant="ghost" className="h-16 text-xl rounded-2xl flex-1" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button className="h-16 text-xl rounded-2xl flex-1 shadow-lg shadow-primary/20" onClick={() => setStep(3)}>
                Next →
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3 — Look at what's coming up */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col h-full"
          >
            <StepBar />
            <h1 className="text-4xl font-display font-bold mb-4 leading-tight">
              What's coming up?
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Take a look at what's on your plate.
            </p>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
              {upcomingItems.length === 0 ? (
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-border/60">
                  <Calendar className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                  <p className="text-lg text-muted-foreground">Nothing scheduled coming up.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {upcomingItems.map((i: CapturedItem) => (
                    <div key={i.id} className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-border/60 min-h-[64px]">
                      <div className="flex-shrink-0 text-sm font-bold text-primary w-20 text-right">
                        {i.scheduledDate ? friendlyDate(i.scheduledDate) : i.timing === 'this-week' ? 'This week' : 'Later'}
                      </div>
                      <div className="w-px h-8 bg-border/60 flex-shrink-0" />
                      <p className="text-lg font-medium leading-tight">{i.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-6 flex gap-3">
              <Button variant="ghost" className="h-16 text-xl rounded-2xl flex-1" onClick={() => setStep(2)}>
                ← Back
              </Button>
              <Button className="h-16 text-xl rounded-2xl flex-1 shadow-lg shadow-primary/20" onClick={() => setStep(4)}>
                Next →
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4 — Pick priorities for next week */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col h-full"
          >
            <StepBar />
            <h1 className="text-4xl font-display font-bold mb-4 leading-tight">
              Pick 3 things for next week
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Tap to mark what matters most.
            </p>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
              {thisWeekItems.length === 0 ? (
                <p className="text-center text-muted-foreground text-lg py-10">
                  Nothing scheduled for this week yet.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {thisWeekItems.map((i: CapturedItem) => (
                    <div
                      key={i.id}
                      onClick={() => updateItem(i.id, { isPriority: !i.isPriority })}
                      className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.98] min-h-[64px] ${
                        i.isPriority
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border/60 bg-card hover:border-border'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          i.isPriority ? 'border-primary bg-primary text-white' : 'border-border/80 bg-background'
                        }`}
                      >
                        {i.isPriority && (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium text-xl leading-tight">{i.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-6 flex gap-3">
              <Button variant="ghost" className="h-16 text-xl rounded-2xl flex-1" onClick={() => setStep(3)}>
                ← Back
              </Button>
              <Button
                className="h-16 text-xl rounded-2xl flex-1 shadow-lg shadow-primary/20"
                onClick={() => setLocation('/today')}
              >
                Finish 🎉
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
