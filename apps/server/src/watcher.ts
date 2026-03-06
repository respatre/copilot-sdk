import { watch } from "chokidar";
import path from "node:path";
import type { WsOutgoing } from "./types.js";

const PROJECTS_DIR = path.resolve(process.env.PROJECTS_DIR || "./projects");

export function startWatcher(broadcast: (msg: WsOutgoing) => void): void {
  const watcher = watch(PROJECTS_DIR, {
    ignoreInitial: true,
    ignored: [/(^|[/\\])\../, "**/node_modules/**"],
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  watcher.on("add", (filePath) => {
    broadcast({
      type: "file_created",
      path: path.relative(PROJECTS_DIR, filePath),
      fullPath: filePath,
    });
  });

  watcher.on("change", (filePath) => {
    broadcast({
      type: "file_updated",
      path: path.relative(PROJECTS_DIR, filePath),
      fullPath: filePath,
    });
  });

  watcher.on("unlink", (filePath) => {
    broadcast({
      type: "file_deleted",
      path: path.relative(PROJECTS_DIR, filePath),
      fullPath: filePath,
    });
  });

  console.log("[watcher] watching", PROJECTS_DIR);
}
