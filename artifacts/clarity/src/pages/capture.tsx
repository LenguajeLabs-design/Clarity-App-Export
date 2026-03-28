import { useState } from "react";
import { useLocation } from "wouter";
import { useAppData } from "@/lib/useAppData";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { CapturedItem } from "@/lib/types";

export default function Capture() {
  const { addItem, items } = useAppData();
  const [text, setText] = useState('');
  const [, setLocation] = useLocation();

  const handleSave = () => {
    if (!text.trim()) return;
    addItem(text.trim());
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  };

  const untriagedCount = items.filter((i: CapturedItem) => !i.isTriaged && !i.isDeleted).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-full p-6"
    >
      <div className="flex items-center mb-12 mt-4">
        <div className="w-10 h-10 rounded-[14px] bg-primary/10 flex items-center justify-center text-primary mr-3 shadow-inner">
          <Sparkles className="w-5 h-5" />
        </div>
        <h1 className="text-xl font-display font-semibold tracking-tight text-foreground/80">Clarity</h1>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto pb-16">
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
          Save it
        </Button>

        <button
          onClick={() => setLocation('/inbox')}
          className="mt-10 text-center text-muted-foreground font-medium hover:text-foreground transition-colors py-4 active:scale-95"
        >
          {untriagedCount > 0
            ? `You have ${untriagedCount} ${untriagedCount === 1 ? 'thing' : 'things'} to sort →`
            : "Your inbox is clear ✨"}
        </button>
      </div>
    </motion.div>
  );
}
