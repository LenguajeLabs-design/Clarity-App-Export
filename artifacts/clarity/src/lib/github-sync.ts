/**
 * GitHub Sync — stores all Clarity data as a single JSON file in a private repo.
 *
 * Strategy: "latest write wins"
 *   1. Pull the remote file (get content + sha)
 *   2. Compare syncedAt timestamps — whichever is newer is the source of truth
 *   3. Push the winner back to GitHub with a fresh syncedAt
 *
 * All GitHub API calls are proxied through /api/github/* on the API server.
 * This means GitHub sync works even when api.github.com is blocked (e.g. China).
 */

import type { CapturedItem, Project, UserSettings } from './types';

// ─── Config ──────────────────────────────────────────────────────────────────

export interface GitHubConfig {
  /** Personal Access Token with Contents read+write on the target repo */
  token: string;
  /** "owner/repo-name" e.g. "alice/clarity-backup" */
  repo: string;
  /** Path inside the repo, e.g. "clarity-data.json" */
  filePath: string;
}

const CONFIG_KEY = 'clarity_github_config';

export function loadGitHubConfig(): GitHubConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as GitHubConfig) : null;
  } catch {
    return null;
  }
}

export function persistGitHubConfig(config: GitHubConfig | null): void {
  if (config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } else {
    localStorage.removeItem(CONFIG_KEY);
  }
}

// ─── Data envelope ───────────────────────────────────────────────────────────

export interface GitHubSyncData {
  version: 1;
  /** ISO timestamp of the last successful push — used for conflict resolution */
  syncedAt: string;
  items: CapturedItem[];
  projects: Project[];
  settings: UserSettings;
}

// ─── Server-proxied GitHub helpers ───────────────────────────────────────────
// All requests go to /api/github/* so they work even if api.github.com is
// blocked in the user's region.

async function proxyPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api/github/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json() as T & { error?: string };
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return json;
}

/** Safely encode a UTF-8 string to base64 (handles emoji / non-ASCII) */
function toBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

/** Safely decode base64 to UTF-8 string */
function fromBase64(b64: string): string {
  return decodeURIComponent(escape(atob(b64)));
}

// ─── Pull ─────────────────────────────────────────────────────────────────────

/**
 * Fetch the current data file from GitHub (via server proxy).
 * Returns null if the file doesn't exist yet (first ever sync).
 * Throws on network or auth errors.
 */
export async function pullFromGitHub(
  config: GitHubConfig,
): Promise<{ data: GitHubSyncData; sha: string } | null> {
  const result = await proxyPost<{ exists: boolean; content?: string; sha?: string }>(
    'pull',
    { token: config.token, repo: config.repo, filePath: config.filePath },
  );
  if (!result.exists) return null;
  const content = fromBase64(result.content!.replace(/\n/g, ''));
  return { data: JSON.parse(content) as GitHubSyncData, sha: result.sha! };
}

// ─── Push ─────────────────────────────────────────────────────────────────────

/**
 * Write data to GitHub (via server proxy), creating or updating the file.
 * Pass sha when updating (omit on first create).
 */
export async function pushToGitHub(
  config: GitHubConfig,
  data: GitHubSyncData,
  sha?: string,
): Promise<void> {
  const body: Record<string, unknown> = {
    token: config.token,
    repo: config.repo,
    filePath: config.filePath,
    message: `Clarity sync — ${new Date().toLocaleString()}`,
    content: toBase64(JSON.stringify(data, null, 2)),
  };
  if (sha) body.sha = sha;
  await proxyPost('push', body);
}

// ─── Full sync ────────────────────────────────────────────────────────────────

export interface SyncResult {
  /** The winning data set (either local or remote, whichever was newer) */
  mergedData: GitHubSyncData;
  /**
   * true  → remote was newer; caller should replace local app state
   * false → local was newer (or equal); app state is already correct
   */
  hadRemoteUpdate: boolean;
}

/**
 * Sync local data with GitHub using "latest write wins":
 *   1. Pull remote — if newer, it becomes the data we'll use
 *   2. Write a backup to localStorage before any state changes
 *   3. Push the winning data (with a fresh syncedAt timestamp)
 */
export async function syncWithGitHub(
  config: GitHubConfig,
  localData: GitHubSyncData,
): Promise<SyncResult> {
  // Step 1 — pull
  const remote = await pullFromGitHub(config);

  let sha: string | undefined;
  let hadRemoteUpdate = false;
  let winner: GitHubSyncData = localData;

  if (remote) {
    sha = remote.sha;
    const localMs = new Date(localData.syncedAt).getTime();
    const remoteMs = new Date(remote.data.syncedAt).getTime();

    if (remoteMs > localMs) {
      // Remote is newer — use remote data
      winner = remote.data;
      hadRemoteUpdate = true;
    }
  }

  // Step 2 — backup local data before any overwrite
  try {
    localStorage.setItem('clarity_github_backup', JSON.stringify(localData));
  } catch {
    // backup failure is non-fatal
  }

  // Step 3 — push winner
  await pushToGitHub(config, winner, sha);

  return { mergedData: winner, hadRemoteUpdate };
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Quick connectivity check — verifies the token works and the repo exists.
 * Returns the user login on success, throws on failure.
 */
export async function validateGitHubConfig(config: GitHubConfig): Promise<string> {
  const result = await proxyPost<{ login: string }>('validate', {
    token: config.token,
    repo: config.repo,
  });
  return result.login;
}
