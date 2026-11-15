import { useState } from "react";
import { useLocation } from "wouter";
import { useAppData } from "@/lib/useAppData";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const appIcon = `${import.meta.env.BASE_URL}clarity-ripple-v3.svg`;

export default function Capture() {
  const { addItem, items } = useAppData();
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [, setLocation] = useLocation();
  const untriagedCount = items.filter((item) => !item.isTriaged && !item.isDeleted).length;

  const handleSave = () => {
    if (!text.trim()) return;
    addItem(text.trim());
    setText("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) handleSave();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="flex h-full flex-col p-5 sm:p-6">
      <div className="mt-2 flex items-center gap-3">
        <img src={appIcon} alt="" className="h-12 w-12 rounded-2xl object-cover shadow-sm ring-1 ring-border/50" />
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">Clarity</h1>
          <p className="text-xs font-medium text-muted-foreground">Clear the noise. Keep the next step.</p>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-12 pt-8">
            <div className="mb-7">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">Quick capture</p>
              <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">What needs a place?</h2>
              <p className="mt-2 text-base text-muted-foreground">Get it out of your head. You can sort it later.</p>
            </div>

            <div className="mb-5 rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-sm transition-shadow focus-within:border-primary/30 focus-within:shadow-md">
              <label htmlFor="quick-capture" className="sr-only">What is on your mind?</label>
              <textarea
                id="quick-capture"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write one thing…"
                className="min-h-36 w-full resize-none overflow-hidden border-none bg-transparent text-2xl font-medium leading-snug text-foreground outline-none placeholder:text-muted-foreground/45 focus:ring-0 sm:text-3xl"
                rows={4}
                autoFocus
              />
              <p className="mt-2 text-xs text-muted-foreground">Press ⌘ Enter to capture</p>
            </div>

            <Button
              size="lg"
              onClick={handleSave}
              disabled={!text.trim()}
              className="h-16 w-full rounded-2xl text-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.99]"
            >
              {saved ? "Captured ✓" : "Capture this"}
            </Button>

            {untriagedCount > 0 && (
              <button onClick={() => setLocation("/inbox")} className="mt-3 flex min-h-[48px] items-center justify-between rounded-xl px-3 text-left text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
                <span>{untriagedCount} {untriagedCount === 1 ? "task is" : "tasks are"} safely waiting</span>
                <span className="text-primary">Sort a few →</span>
              </button>
            )}
      </motion.div>
    </motion.div>
  );
}
