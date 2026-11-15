import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const output = fileURLToPath(new URL("../dist/public/", import.meta.url));
const base = process.env.BASE_PATH || "/";
const index = await readFile(path.join(output, "index.html"), "utf8");
for (const route of ["today", "inbox", "projects", "upcoming", "review", "done", "settings"]) {
  assert.equal(await readFile(path.join(output, route, "index.html"), "utf8"), index, `Missing direct route ${route}`);
}
for (const match of index.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)) {
  assert.ok(match[1].startsWith(base), `Asset outside deployment base: ${match[1]}`);
  await stat(path.join(output, match[1].slice(base.length)));
}
const manifest = JSON.parse(await readFile(path.join(output, "manifest.json"), "utf8"));
assert.equal(manifest.start_url, "./");
assert.equal(manifest.scope, "./");
for (const icon of manifest.icons) await stat(path.join(output, icon.src));
for (const name of await readdir(path.join(output, "assets"))) {
  if (!name.endsWith(".js")) continue;
  const code = await readFile(path.join(output, "assets", name), "utf8");
  for (const forbidden of ["/api/parse-tasks", "/api/clarity/", "adhd-focus-hub.replit.app", "AI_INTEGRATIONS_OPENAI", "supabase.co"]) {
    assert.ok(!code.includes(forbidden), `Unexpected runtime dependency: ${forbidden}`);
  }
}
console.log("Static routes, project assets, mobile manifest, and backend independence verified.");
