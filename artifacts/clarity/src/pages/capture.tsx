import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAppData } from "@/lib/useAppData";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CapturedItem } from "@/lib/types";

export default function Capture() {
  const { addItem, addItemsBatch, items } = useAppData();
  const [text, setText] = useState('');
  const [brainDumpMode, setBrainDumpMode] = useState(false);
  const [dumpLines, setDumpLines] = useState<string[]>(['']);
  const [saved, setSaved] = useState(false);
  const [, setLocation] = useLocation();
  const lastInputRef = useRef<HTMLInputElement>(null);

  const untriagedCount = items.filter((i: CapturedItem) => !i.isTriaged && !i.isDeleted).length;

  // — Single capture —
  const handleSave = () => {
    if (!text.trim()) return;
    addItem(text.trim());
    setText('');
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
  };

  // — Brain dump mode —
  const enterBrainDump = () => {
    setBrainDumpMode(true);
    setDumpLines(['']);
  };

  const exitBrainDump = () => {
    setBrainDumpMode(false);
    setDumpLines(['']);
  };

  const updateLine = (idx: number, val: string) => {
    setDumpLines((prev) => prev.map((l, i) => (i === idx ? val : l)));
  };

  const addLine = () => {
    setDumpLines((prev) => [...prev, '']);
    // Focus the new input after render
    setTimeout(() => lastInputRef.current?.focus(), 30);
  };

  const removeLine = (idx: number) => {
    if (dumpLines.length === 1) {
      setDumpLines(['']);
      return;
    }
    setDumpLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLine();
    }
    if (e.key === 'Backspace' && dumpLines[idx] === '' && dumpLines.length > 1) {
      e.preventDefault();
      removeLine(idx);
    }
  };

  const saveAllDump = () => {
    const filled = dumpLines.filter((l) => l.trim());
    if (filled.length === 0) return;
    addItemsBatch(filled);
    setBrainDumpMode(false);
    setDumpLines(['']);
    setLocation('/inbox');
  };

  const filledCount = dumpLines.filter((l) => l.trim()).length;

  useEffect(() => {
    if (brainDumpMode) {
      setTimeout(() => lastInputRef.current?.focus(), 50);
    }
  }, [brainDumpMode]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-full p-6"
    >
      {/* Logo */}
      <div className="flex items-center mb-12 mt-4">
        <div className="w-10 h-10 rounded-[14px] bg-primary/10 flex items-center justify-center text-primary mr-3 shadow-inner">
          <Sparkles className="w-5 h-5" />
        </div>
        <h1 className="text-xl font-display font-semibold tracking-tight text-foreground/80">Clarity</h1>
      </div>

      <AnimatePresence mode="wait">
        {/* ——— Single capture mode ——— */}
        {!brainDumpMode && (
          <motion.div
            key="single"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto pb-16"
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's on your mind?"
              className="w-full text-3xl sm:text-4xl bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/40 text-foreground font-medium mb-12 overflow-hidden focus:ring-0"
              rows={4}
              autoFocus
            />

            <Button
              size="lg"
              onClick={handleSave}
              disabled={!text.trim()}
              className="h-16 text-xl rounded-2xl w-full shadow-lg shadow-primary/20 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
            >
              {saved ? 'Saved ✓' : 'Save it'}
            </Button>

            {/* Brain dump CTA */}
            <button
              onClick={enterBrainDump}
              className="mt-6 flex items-center justify-center gap-2 text-muted-foreground font-semibold hover:text-foreground transition-colors py-3 min-h-[48px] active:scale-95"
            >
              <Zap className="w-4 h-4" />
              Brain dump mode — capture a bunch at once
            </button>

            <button
              onClick={() => setLocation('/inbox')}
              className="mt-3 text-center text-muted-foreground/60 text-sm hover:text-muted-foreground transition-colors py-2 active:scale-95"
            >
              {untriagedCount > 0
                ? `${untriagedCount} ${untriagedCount === 1 ? 'item' : 'items'} waiting in inbox →`
                : "Inbox is clear ✨"}
            </button>
          </motion.div>
        )}

        {/* ——— Brain dump mode ——— */}
        {brainDumpMode && (
          <motion.div
            key="dump"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col"
          >
            <div className="mb-6">
              <h2 className="text-3xl font-display font-bold mb-2">Brain dump</h2>
              <p className="text-muted-foreground text-lg">
                Just get it all out. Don't judge, don't filter. One thing per line.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2 pb-4">
              {dumpLines.map((line, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 bg-card border border-border/60 rounded-2xl px-4 shadow-sm"
                >
                  <span className="text-muted-foreground/40 font-bold text-sm w-5 text-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    ref={idx === dumpLines.length - 1 ? lastInputRef : undefined}
                    value={line}
                    onChange={(e) => updateLine(idx, e.target.value)}
                    onKeyDown={(e) => handleLineKeyDown(e, idx)}
                    placeholder={idx === 0 ? "First thing on your mind…" : "Another thing…"}
                    className="flex-1 h-[56px] bg-transparent text-lg font-medium text-foreground placeholder:text-muted-foreground/40 border-none outline-none focus:ring-0"
                  />
                  {dumpLines.length > 1 && (
                    <button
                      onClick={() => removeLine(idx)}
                      className="w-8 h-8 flex items-center justify-center text-muted-foreground/40 hover:text-red-400 transition-colors flex-shrink-0"
                      aria-label="Remove this item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}

              <button
                onClick={addLine}
                className="flex items-center gap-3 px-4 py-4 text-muted-foreground hover:text-foreground transition-colors mt-1 min-h-[48px] active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span className="text-lg font-medium">Add another</span>
              </button>
            </div>

            <div className="pt-4 flex flex-col gap-3 pb-4">
              <Button
                size="lg"
                onClick={saveAllDump}
                disabled={filledCount === 0}
                className="h-16 text-xl rounded-2xl w-full shadow-lg shadow-primary/20"
              >
                Save {filledCount > 0 ? `${filledCount} item${filledCount !== 1 ? 's' : ''}` : 'items'} to inbox
              </Button>
              <button
                onClick={exitBrainDump}
                className="text-muted-foreground font-semibold text-lg hover:text-foreground transition-colors py-3 min-h-[48px] text-center active:scale-95"
              >
                ← Back to single capture
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
