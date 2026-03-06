import { Router } from "express";
import multer from "multer";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import unzipper from "unzipper";
import { v4 as uuidv4 } from "uuid";
import type { WsOutgoing } from "../types.js";

const PROJECTS_DIR = path.resolve(process.env.PROJECTS_DIR || "./projects");
const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100 MB

// Store uploads in a temp directory, auto-cleaned
const upload = multer({
  dest: path.join(PROJECTS_DIR, ".tmp-uploads"),
  limits: { fileSize: MAX_UPLOAD_SIZE },
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function uploadRoutes(broadcast: (msg: WsOutgoing) => void): Router {
  const router = Router();

  // ── Upload a ZIP file as a new project ──
  router.post("/zip", upload.single("file"), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const projectName =
      (req.body as { name?: string }).name ||
      req.file.originalname.replace(/\.zip$/i, "");

    const id = uuidv4();
    const slug = `${slugify(projectName)}-${id.slice(0, 8)}`;
    const projectDir = path.join(PROJECTS_DIR, slug);

    try {
      await fs.mkdir(projectDir, { recursive: true });

      broadcast({ type: "tool_start", toolName: "unzip-upload" });

      // Extract ZIP
      await new Promise<void>((resolve, reject) => {
        createReadStream(req.file!.path)
          .pipe(unzipper.Extract({ path: projectDir }))
          .on("close", resolve)
          .on("error", reject);
      });

      // If the ZIP contains a single top-level folder, flatten it
      const entries = await fs.readdir(projectDir);
      const nonHidden = entries.filter((e) => !e.startsWith("."));
      if (nonHidden.length === 1) {
        const inner = path.join(projectDir, nonHidden[0]);
        const stat = await fs.stat(inner);
        if (stat.isDirectory()) {
          const innerEntries = await fs.readdir(inner);
          for (const entry of innerEntries) {
            await fs.rename(
              path.join(inner, entry),
              path.join(projectDir, entry),
            );
          }
          await fs.rmdir(inner);
        }
      }

      broadcast({
        type: "tool_complete",
        toolName: "unzip-upload",
        success: true,
      });

      // Create DevFlow meta
      const meta = {
        id,
        name: projectName,
        slug,
        sessionId: "",
        model: "gpt-4.1",
        createdAt: new Date().toISOString(),
        directory: projectDir,
        source: { type: "upload", originalName: req.file.originalname },
      };

      await fs.writeFile(
        path.join(projectDir, ".devflow.json"),
        JSON.stringify(meta, null, 2),
      );

      res.status(201).json(meta);
    } catch (err) {
      await fs.rm(projectDir, { recursive: true, force: true }).catch(() => {});
      broadcast({ type: "error", message: `Upload failed: ${String(err)}` });
      res.status(500).json({ error: String(err) });
    } finally {
      // Clean temp file
      await fs.unlink(req.file.path).catch(() => {});
    }
  });

  // ── Upload multiple files as a new project ──
  router.post("/files", upload.array("files", 500), async (req, res) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const projectName =
      (req.body as { name?: string }).name || "uploaded-project";
    const id = uuidv4();
    const slug = `${slugify(projectName)}-${id.slice(0, 8)}`;
    const projectDir = path.join(PROJECTS_DIR, slug);

    try {
      await fs.mkdir(projectDir, { recursive: true });

      broadcast({ type: "tool_start", toolName: "upload-files" });

      for (const file of files) {
        // The originalname may contain path info (webkitRelativePath)
        const relativePath =
          (req.body as Record<string, string>)[
            `paths[${files.indexOf(file)}]`
          ] || file.originalname;

        // Prevent path traversal
        const safe = path
          .normalize(relativePath)
          .replace(/^(\.\.(\/|\\|$))+/, "");
        const dest = path.join(projectDir, safe);

        // Ensure dest is under projectDir
        if (!path.resolve(dest).startsWith(path.resolve(projectDir))) {
          continue; // skip malicious paths
        }

        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.rename(file.path, dest);
      }

      broadcast({
        type: "tool_complete",
        toolName: "upload-files",
        success: true,
      });

      const meta = {
        id,
        name: projectName,
        slug,
        sessionId: "",
        model: "gpt-4.1",
        createdAt: new Date().toISOString(),
        directory: projectDir,
        source: { type: "upload", fileCount: files.length },
      };

      await fs.writeFile(
        path.join(projectDir, ".devflow.json"),
        JSON.stringify(meta, null, 2),
      );

      res.status(201).json(meta);
    } catch (err) {
      await fs.rm(projectDir, { recursive: true, force: true }).catch(() => {});
      broadcast({ type: "error", message: `Upload failed: ${String(err)}` });
      res.status(500).json({ error: String(err) });
    } finally {
      // Clean remaining temp files
      for (const file of files) {
        await fs.unlink(file.path).catch(() => {});
      }
    }
  });

  return router;
}
