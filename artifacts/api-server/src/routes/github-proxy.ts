import { Router, type IRouter } from "express";

const router: IRouter = Router();

const GH_API = "https://api.github.com";

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": "Clarity-App",
  };
}

function isValidToken(t: unknown): t is string {
  return typeof t === "string" && t.length > 0 && t.length < 500;
}
function isValidRepo(r: unknown): r is string {
  return typeof r === "string" && /^[\w.-]+\/[\w.-]+$/.test(r);
}
function isValidPath(p: unknown): p is string {
  return typeof p === "string" && p.length > 0 && p.length < 500;
}

// ─── Validate token + repo ────────────────────────────────────────────────────
router.post("/github/validate", async (req, res) => {
  const { token, repo } = req.body as { token?: unknown; repo?: unknown };
  if (!isValidToken(token) || !isValidRepo(repo)) {
    res.status(400).json({ error: "Missing or invalid token / repo" });
    return;
  }
  try {
    const [userRes, repoRes] = await Promise.all([
      fetch(`${GH_API}/user`, { headers: ghHeaders(token) }),
      fetch(`${GH_API}/repos/${repo}`, { headers: ghHeaders(token) }),
    ]);
    if (!userRes.ok) {
      res.status(401).json({ error: `Invalid token (${userRes.status})` });
      return;
    }
    const user = (await userRes.json()) as { login: string };
    if (repoRes.status === 404) {
      res.status(404).json({ error: `Repository "${repo}" not found` });
      return;
    }
    if (!repoRes.ok) {
      res.status(400).json({ error: `Cannot access repository (${repoRes.status})` });
      return;
    }
    res.json({ login: user.login });
  } catch (e) {
    console.error("[github-proxy] validate error:", e);
    res.status(502).json({ error: "Could not reach GitHub — check your connection." });
  }
});

// ─── Pull file ────────────────────────────────────────────────────────────────
router.post("/github/pull", async (req, res) => {
  const { token, repo, filePath } = req.body as {
    token?: unknown; repo?: unknown; filePath?: unknown;
  };
  if (!isValidToken(token) || !isValidRepo(repo) || !isValidPath(filePath)) {
    res.status(400).json({ error: "Missing or invalid token / repo / filePath" });
    return;
  }
  const url = `${GH_API}/repos/${repo}/contents/${filePath}`;
  try {
    const ghRes = await fetch(url, { headers: ghHeaders(token) });
    if (ghRes.status === 404) {
      res.json({ exists: false });
      return;
    }
    if (!ghRes.ok) {
      const body = await ghRes.text().catch(() => "");
      res.status(502).json({ error: `GitHub pull failed (${ghRes.status}): ${body || ghRes.statusText}` });
      return;
    }
    const json = (await ghRes.json()) as { content: string; sha: string };
    res.json({ exists: true, content: json.content, sha: json.sha });
  } catch (e) {
    console.error("[github-proxy] pull error:", e);
    res.status(502).json({ error: "Could not reach GitHub — check your connection." });
  }
});

// ─── Push file ────────────────────────────────────────────────────────────────
router.post("/github/push", async (req, res) => {
  const { token, repo, filePath, message, content, sha } = req.body as {
    token?: unknown; repo?: unknown; filePath?: unknown;
    message?: unknown; content?: unknown; sha?: unknown;
  };
  if (
    !isValidToken(token) || !isValidRepo(repo) || !isValidPath(filePath) ||
    typeof message !== "string" || typeof content !== "string"
  ) {
    res.status(400).json({ error: "Missing or invalid push parameters" });
    return;
  }
  const url = `${GH_API}/repos/${repo}/contents/${filePath}`;
  const body: Record<string, string> = { message, content };
  if (typeof sha === "string" && sha.length > 0) body.sha = sha;

  try {
    const ghRes = await fetch(url, {
      method: "PUT",
      headers: ghHeaders(token),
      body: JSON.stringify(body),
    });
    if (!ghRes.ok) {
      const text = await ghRes.text().catch(() => "");
      res.status(502).json({ error: `GitHub push failed (${ghRes.status}): ${text || ghRes.statusText}` });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("[github-proxy] push error:", e);
    res.status(502).json({ error: "Could not reach GitHub — check your connection." });
  }
});

export default router;
