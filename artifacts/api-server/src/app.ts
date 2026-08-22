import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

function buildAllowedOrigins() {
  const configuredOrigins = (process.env["ALLOWED_ORIGINS"] ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [
    ...configuredOrigins,
    "https://adhd-focus-hub.replit.app",
    "http://localhost:26011",
    "http://localhost:3000",
    "http://localhost:5173",
    /\.replit\.dev$/,
    /\.replit\.app$/,
  ];
}

// Trust the first proxy hop so express-rate-limit can read X-Forwarded-For
// correctly behind Replit's reverse proxy in production.
app.set('trust proxy', 1);

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = buildAllowedOrigins();

app.use(cors({ origin: ALLOWED_ORIGINS }));

// ─── Body parsing (with size limits) ─────────────────────────────────────────
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));

// ─── Rate limiting ────────────────────────────────────────────────────────────

// Sync & auth: 60 requests per minute per IP
const syncLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please slow down." },
});

// AI endpoint: 20 requests per minute per IP (cost protection)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests — please wait a moment." },
});

app.use("/api/clarity", syncLimiter);
app.use("/api/parse-tasks", aiLimiter);

app.use("/api", router);

export default app;
