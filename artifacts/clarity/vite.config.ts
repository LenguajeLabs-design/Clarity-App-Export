import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import type { IncomingMessage, ServerResponse } from "node:http";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

function aiParseMiddleware() {
  return {
    name: "ai-parse-tasks",
    configureServer(server: { middlewares: { use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url !== "/__clarity_ai__/parse-tasks" || req.method !== "POST") {
          return next();
        }

        let body = "";
        req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
        req.on("end", async () => {
          try {
            const { text } = JSON.parse(body) as { text: string };
            if (!text?.trim()) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "No text provided" }));
              return;
            }

            const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
            const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

            if (!baseUrl || !apiKey) {
              res.statusCode = 503;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "AI not configured" }));
              return;
            }

            const response = await fetch(`${baseUrl}/chat/completions`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: "gpt-5-mini",
                response_format: { type: "json_object" },
                messages: [
                  {
                    role: "system",
                    content: `You are a helpful task parser for an ADHD task manager called Clarity. Given any block of text (stream of consciousness, bullet points, paragraphs — anything), extract every distinct task, errand, to-do, or action item.

Return ONLY a JSON object with a "tasks" array. Each task object:
{
  "text": "concise task description (max 80 characters, start with a verb)",
  "type": "task" | "project" | "note",
  "area": "work" | "home" | "family" | "personal",
  "timing": "today" | "this-week" | "later"
}

Rules:
- If something has multiple steps, type = "project"
- Events/appointments/single actions = "task"
- Ideas, reminders-to-think-about, reference info = "note"
- Infer area from context clues (work meeting → work, kids → family, fix the car → home, etc.)
- Default timing to "later" if unclear; "today" only if urgency is explicit
- Split compound items ("call dentist AND pick up groceries") into separate tasks
- Keep text concise and actionable — start with a verb where possible`,
                  },
                  {
                    role: "user",
                    content: `Extract all tasks from this text:\n\n${text}`,
                  },
                ],
              }),
            });

            if (!response.ok) {
              const errText = await response.text();
              console.error("[AI parse] OpenAI error:", response.status, errText);
              throw new Error(`OpenAI error ${response.status}`);
            }

            const data = await response.json() as {
              choices?: Array<{ message?: { content?: string } }>;
            };
            const content = data.choices?.[0]?.message?.content ?? '{"tasks":[]}';
            const parsed = JSON.parse(content) as { tasks: unknown[] };

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(parsed));
          } catch (e) {
            console.error("[AI parse] error:", e);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Failed to parse tasks — please try again" }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    aiParseMiddleware(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
