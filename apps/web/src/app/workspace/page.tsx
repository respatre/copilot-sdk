"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { fetchProjects, type ProjectMeta } from "../../lib/api";

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("id") ?? "";

  const [project, setProject] = useState<ProjectMeta | null>(null);

  useEffect(() => {
    if (!projectId) return;
    fetchProjects().then((projects) => {
      const p = projects.find((p) => p.id === projectId);
      if (p) setProject(p);
    });
  }, [projectId]);

  if (!projectId) {
    return (
      <div
        className="h-dvh flex items-center justify-center"
        style={{ color: "var(--text-muted)", background: "var(--bg-primary)" }}
      >
        No project selected
      </div>
    );
  }

  return (
    <div
      className="h-dvh flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      <header className="glass-header flex items-center gap-2 px-3 py-2 shrink-0 sticky top-0 z-30">
        <button
          onClick={() => router.push("/")}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-muted)" }}
          aria-label="Back to projects"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1
            className="text-sm font-semibold truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {project?.name ?? "Loading..."}
          </h1>
          <p
            className="text-[10px] font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            {project?.model ?? ""}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-hidden"></main>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="h-dvh flex items-center justify-center text-zinc-500">
          Loading...
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
