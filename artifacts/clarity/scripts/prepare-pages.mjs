import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const output = fileURLToPath(new URL("../dist/public/", import.meta.url));
// Physical entry pages preserve clean direct links without hash routing or a
// 404 redirect. Keep this list aligned with App.tsx when introducing routes.
for (const route of ["today", "inbox", "projects", "upcoming", "review", "done", "settings"]) {
  await mkdir(path.join(output, route), { recursive: true });
  await copyFile(path.join(output, "index.html"), path.join(output, route, "index.html"));
}
await copyFile(path.join(output, "index.html"), path.join(output, "404.html"));
await writeFile(path.join(output, ".nojekyll"), "");
