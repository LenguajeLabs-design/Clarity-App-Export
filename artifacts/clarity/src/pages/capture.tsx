import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAppData } from "@/lib/useAppData";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Plus, Trash2, Loader2, X, CheckCircle2 } from "lucide-react";
import appIcon from "/icon.png";
import { motion, AnimatePresence } from "framer-motion";
import { CapturedItem, ItemType, AreaOfLife, Timing } from "@/lib/types";
import { AREA_COLOR, AREA_LABEL, TIMING_COLOR, TIMING_LABEL, TYPE_LABEL } from "@/lib/colors";

type BrainDumpTab = "lines" | "ai";

interface ParsedTask {
  text: string;
  type: "task" | "project" | "note";
  area: "work" | "home" | "family" | "personal";
  timing: "today" | "this-week" | "later";
  keep: boolean;
}

export default function Capture() {
  const { addItem, addItemsBatch, addItemsBatchStructured, items, projects } = useAppData();
  const [text, setText] = useState("");
  const [brainDumpMode, setBrainDumpMode] = useState(false);
  const [brainDumpTab, setBrainDumpTab] = useState<BrainDumpTab>("lines");

  // Line-by-line mode
  const [dumpLines, setDumpLines] = useState<string[]>([""]);
  const lastInputRef = useRef<HTMLInputElement>(null);

  // AI parse mode
  const [rawText, setRawText] = useState("");
  const [isParsingAI, setIsParsingAI] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [aiError, setAiError] = useState("");
  const [aiSaved, setAiSaved] = useState(false);

  const [saved, setSaved] = useState(false);
  const [, setLocation] = useLocation();

  const untriagedCount  = items.filter((i: CapturedItem) => !i.isTriaged && !i.isDeleted).length;
  const todayCount      = items.filter((i: CapturedItem) => i.isTriaged && !i.isDeleted && !i.isCompleted && (i.timing === 'today' || i.isPriority)).length;
  const projectsCount   = projects.filter((p) => p.status !== 'done').length;
  const isFirstTime = items.length === 0;

  // — Single capture —
  const handleSave = () => {
    if (!text.trim()) return;
    addItem(text.trim());
    setText("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
  };

  // — Brain dump mode —
  const enterBrainDump = () => {
    setBrainDumpMode(true);
    setBrainDumpTab("lines");
    setDumpLines([""]);
    setParsedTasks([]);
    setRawText("");
    setAiError("");
    setAiSaved(false);
  };

  const exitBrainDump = () => {
    setBrainDumpMode(false);
    setDumpLines([""]);
    setParsedTasks([]);
    setRawText("");
    setAiError("");
    setAiSaved(false);
  };

  // Line-by-line handlers
  const updateLine = (idx: number, val: string) => {
    setDumpLines((prev) => prev.map((l, i) => (i === idx ? val : l)));
  };

  const addLine = () => {
    setDumpLines((prev) => [...prev, ""]);
    setTimeout(() => lastInputRef.current?.focus(), 30);
  };

  const removeLine = (idx: number) => {
    if (dumpLines.length === 1) { setDumpLines([""]); return; }
    setDumpLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Enter") { e.preventDefault(); addLine(); }
    if (e.key === "Backspace" && dumpLines[idx] === "" && dumpLines.length > 1) {
      e.preventDefault();
      removeLine(idx);
    }
  };

  const saveAllDump = () => {
    const filled = dumpLines.filter((l) => l.trim());
    if (filled.length === 0) return;
    addItemsBatch(filled);
    exitBrainDump();
    setLocation("/inbox");
  };

  const filledCount = dumpLines.filter((l) => l.trim()).length;

  // AI parse handlers
  const handleAIParse = async () => {
    if (!rawText.trim()) return;
    setIsParsingAI(true);
    setAiError("");
    setParsedTasks([]);
    try {
      const response = await fetch("/__clarity_ai__/parse-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });
      const data = await response.json() as { tasks?: ParsedTask[]; error?: string };
      if (!response.ok || data.error) throw new Error(data.error ?? "Parse failed");
      const tasks = (data.tasks ?? []).map((t) => ({ ...t, keep: true }));
      setParsedTasks(tasks);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setIsParsingAI(false);
    }
  };

  const toggleKeep = (idx: number) => {
    setParsedTasks((prev) => prev.map((t, i) => i === idx ? { ...t, keep: !t.keep } : t));
  };

  const removeTask = (idx: number) => {
    setParsedTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveAIParsed = () => {
    const toSave = parsedTasks.filter((t) => t.keep);
    if (toSave.length === 0) return;
    addItemsBatchStructured(toSave.map((t) => ({
      text: t.text,
      type: t.type as ItemType,
      area: t.area as AreaOfLife,
      timing: t.timing as Timing,
    })));
    setAiSaved(true);
    setTimeout(() => {
      exitBrainDump();
      setLocation("/inbox");
    }, 1000);
  };

  const keptCount = parsedTasks.filter((t) => t.keep).length;

  useEffect(() => {
    if (brainDumpMode && brainDumpTab === "lines") {
      setTimeout(() => lastInputRef.current?.focus(), 50);
    }
  }, [brainDumpMode, brainDumpTab]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-full p-6"
    >
      {/* Logo */}
      <div className="flex items-center mb-10 mt-4">
        <img src={appIcon} alt="Clarity" className="w-10 h-10 rounded-[14px] mr-3 shadow-sm object-cover" />
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
            {isFirstTime && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-4 rounded-2xl bg-primary/5 border border-primary/10"
              >
                <p className="text-base text-foreground/70 leading-relaxed">
                  <span className="font-semibold text-foreground">Welcome to Clarity.</span>{" "}
                  Start by writing down whatever is taking up space in your head. One thing, or use brain dump mode to get it all out at once.
                </p>
              </motion.div>
            )}

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's on your mind?"
              className="w-full text-3xl sm:text-4xl bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/40 text-foreground font-medium mb-10 overflow-hidden focus:ring-0"
              rows={4}
              autoFocus
            />

            <Button
              size="lg"
              onClick={handleSave}
              disabled={!text.trim()}
              className="h-16 text-xl rounded-2xl w-full shadow-lg shadow-primary/20 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
            >
              {saved ? "Saved ✓" : "Save it"}
            </Button>

            <button
              onClick={enterBrainDump}
              className="mt-6 flex items-center justify-center gap-2 text-muted-foreground font-semibold hover:text-foreground transition-colors py-3 min-h-[48px] active:scale-95"
            >
              <Zap className="w-4 h-4" />
              Brain dump — get it all out at once
            </button>

            {/* System overview cards — only shown when there's data */}
            {!isFirstTime && (
              <div className="mt-6 grid grid-cols-3 gap-3">
                {/* Inbox */}
                <button
                  onClick={() => setLocation("/inbox")}
                  className="flex flex-col items-center justify-center bg-card border border-border/60 rounded-2xl py-4 px-2 shadow-sm hover:shadow-md hover:border-border active:scale-95 transition-all min-h-[80px]"
                >
                  <span className={`text-2xl font-bold font-display tabular-nums ${untriagedCount > 0 ? "text-primary" : "text-muted-foreground/50"}`}>
                    {untriagedCount}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium mt-1">Inbox</span>
                </button>

                {/* Today */}
                <button
                  onClick={() => setLocation("/today")}
                  className="flex flex-col items-center justify-center bg-card border border-border/60 rounded-2xl py-4 px-2 shadow-sm hover:shadow-md hover:border-border active:scale-95 transition-all min-h-[80px]"
                >
                  <span className={`text-2xl font-bold font-display tabular-nums ${todayCount > 0 ? "text-foreground" : "text-muted-foreground/50"}`}>
                    {todayCount}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium mt-1">Today</span>
                </button>

                {/* Projects */}
                <button
                  onClick={() => setLocation("/projects")}
                  className="flex flex-col items-center justify-center bg-card border border-border/60 rounded-2xl py-4 px-2 shadow-sm hover:shadow-md hover:border-border active:scale-95 transition-all min-h-[80px]"
                >
                  <span className={`text-2xl font-bold font-display tabular-nums ${projectsCount > 0 ? "text-foreground" : "text-muted-foreground/50"}`}>
                    {projectsCount}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium mt-1">Projects</span>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ——— Brain dump mode ——— */}
        {brainDumpMode && (
          <motion.div
            key="dump"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="mb-5">
              <h2 className="text-3xl font-display font-bold mb-1">Brain dump</h2>
              <p className="text-muted-foreground">
                Get it all out — don't judge, don't filter.
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex bg-muted/60 rounded-2xl p-1 mb-5 gap-1">
              <button
                onClick={() => setBrainDumpTab("lines")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                  brainDumpTab === "lines"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                One per line
              </button>
              <button
                onClick={() => setBrainDumpTab("ai")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
                  brainDumpTab === "ai"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Paste &amp; AI parse
              </button>
            </div>

            <AnimatePresence mode="wait">
              {/* Line-by-line tab */}
              {brainDumpTab === "lines" && (
                <motion.div
                  key="lines-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col min-h-0"
                >
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
                            aria-label="Remove"
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

                  <div className="pt-3 flex flex-col gap-3 pb-2">
                    <Button
                      size="lg"
                      onClick={saveAllDump}
                      disabled={filledCount === 0}
                      className="h-16 text-xl rounded-2xl w-full shadow-lg shadow-primary/20"
                    >
                      Save {filledCount > 0 ? `${filledCount} item${filledCount !== 1 ? "s" : ""}` : "items"} to inbox
                    </Button>
                    <button
                      onClick={exitBrainDump}
                      className="text-muted-foreground font-semibold text-lg hover:text-foreground transition-colors py-3 min-h-[48px] text-center active:scale-95"
                    >
                      ← Back
                    </button>
                  </div>
                </motion.div>
              )}

              {/* AI parse tab */}
              {brainDumpTab === "ai" && (
                <motion.div
                  key="ai-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  {/* Before parsing — show the textarea */}
                  {parsedTasks.length === 0 && !isParsingAI && (
                    <div className="flex-1 flex flex-col min-h-0">
                      <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
                        Write or paste anything — a stream of consciousness, scattered bullet points, a long rambling paragraph. AI will find the tasks in it.
                      </p>
                      <textarea
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder={"I need to call the dentist, and also Jake's birthday is coming up so I should get a gift... work has that big presentation I haven't started, the car needs an oil change, Mom wants me to call her back..."}
                        className="flex-1 w-full bg-card border border-border/60 rounded-2xl px-4 py-4 text-base text-foreground placeholder:text-muted-foreground/40 resize-none outline-none focus:ring-2 focus:ring-primary/30 leading-relaxed"
                        autoFocus
                      />
                      {aiError && (
                        <p className="mt-2 text-red-500 text-sm">{aiError}</p>
                      )}
                      <div className="pt-4 flex flex-col gap-3 pb-2">
                        <Button
                          size="lg"
                          onClick={handleAIParse}
                          disabled={!rawText.trim()}
                          className="h-16 text-xl rounded-2xl w-full shadow-lg shadow-primary/20 gap-2"
                        >
                          <Sparkles className="w-5 h-5" />
                          Parse with AI
                        </Button>
                        <button
                          onClick={exitBrainDump}
                          className="text-muted-foreground font-semibold text-lg hover:text-foreground transition-colors py-3 min-h-[48px] text-center active:scale-95"
                        >
                          ← Back
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Loading */}
                  {isParsingAI && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      <p className="text-lg text-muted-foreground font-medium">Sorting through your thoughts…</p>
                    </div>
                  )}

                  {/* Parsed results */}
                  {parsedTasks.length > 0 && !isParsingAI && (
                    <div className="flex-1 flex flex-col min-h-0">
                      <p className="text-sm text-muted-foreground mb-3">
                        AI found <span className="font-semibold text-foreground">{parsedTasks.length} tasks</span>. Remove any that don't belong.
                      </p>
                      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2 pb-2">
                        {parsedTasks.map((task, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: task.keep ? 1 : 0.4, y: 0 }}
                            className={`bg-card border rounded-2xl px-4 py-3 shadow-sm transition-all ${
                              task.keep ? "border-border/60" : "border-border/30"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => toggleKeep(idx)}
                                className="mt-0.5 flex-shrink-0 w-6 h-6 flex items-center justify-center"
                                aria-label={task.keep ? "Deselect" : "Select"}
                              >
                                {task.keep
                                  ? <CheckCircle2 className="w-5 h-5 text-primary" />
                                  : <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                                }
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`text-base font-medium leading-snug ${task.keep ? "text-foreground" : "text-muted-foreground line-through"}`}>
                                  {task.text}
                                </p>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {/* Type pill — neutral */}
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                    {TYPE_LABEL[task.type] ?? task.type}
                                  </span>
                                  {/* Area dot + label — colored dot, no colored background */}
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                                    style={{
                                      backgroundColor: `${AREA_COLOR[task.area] ?? "#7A8599"}18`,
                                      color: AREA_COLOR[task.area] ?? "#7A8599",
                                    }}
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
                                      style={{ backgroundColor: AREA_COLOR[task.area] ?? "#7A8599" }}
                                    />
                                    {AREA_LABEL[task.area] ?? task.area}
                                  </span>
                                  {/* Timing pill — muted amber for today, gray for later */}
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                                    style={{
                                      backgroundColor: `${TIMING_COLOR[task.timing] ?? "#7A8599"}18`,
                                      color: TIMING_COLOR[task.timing] ?? "#7A8599",
                                    }}
                                  >
                                    {TIMING_LABEL[task.timing] ?? task.timing}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => removeTask(idx)}
                                className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-muted-foreground/40 hover:text-red-400 transition-colors"
                                aria-label="Remove"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        ))}

                        <button
                          onClick={() => { setParsedTasks([]); setAiError(""); }}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors py-3 text-center active:scale-95"
                        >
                          ↩ Re-paste different text
                        </button>
                      </div>

                      <div className="pt-3 flex flex-col gap-3 pb-2">
                        <Button
                          size="lg"
                          onClick={saveAIParsed}
                          disabled={keptCount === 0 || aiSaved}
                          className="h-16 text-xl rounded-2xl w-full shadow-lg shadow-primary/20 gap-2"
                        >
                          {aiSaved
                            ? "Saved ✓"
                            : `Add ${keptCount} task${keptCount !== 1 ? "s" : ""} to inbox`}
                        </Button>
                        <button
                          onClick={exitBrainDump}
                          className="text-muted-foreground font-semibold text-lg hover:text-foreground transition-colors py-3 min-h-[48px] text-center active:scale-95"
                        >
                          ← Back
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
