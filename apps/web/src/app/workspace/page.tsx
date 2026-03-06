"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import BottomNav, { type TabId } from "../../components/BottomNav";
import ChatPanel from "../../components/ChatPanel";
import CodeViewer from "../../components/CodeViewer";
import FileExplorer from "../../components/FileExplorer";
import { useChat } from "../../hooks/useChat";
import { useFiles } from "../../hooks/useFiles";
import { fetchProjects, type ProjectMeta } from "../../lib/api";

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("id") ?? "";

  const [tab, setTab] = useState<TabId>("chat");
  const [project, setProject] = useState<ProjectMeta | null>(null);
  const [hasNewFiles, setHasNewFiles] = useState(false);

  const {
    messages,
    streaming,
    tool,
    fileEvents,
    sendMessage,
    clearFileEvents,
  } = useChat(projectId);
  const {
    files,
    selectedFile,
    fileContent,
    loading: fileLoading,
    refresh,
    openFile,
    closeFile,
  } = useFiles(projectId);

  useEffect(() => {
    if (!projectId) return;
    fetchProjects().then((projects) => {
      const p = projects.find((p) => p.id === projectId);
      if (p) setProject(p);
    });
  }, [projectId]);

  useEffect(() => {
    if (fileEvents.length > 0) {
      refresh();
      setHasNewFiles(true);
      clearFileEvents();
    }
  }, [fileEvents, refresh, clearFileEvents]);

  useEffect(() => {
    if (tab === "files") setHasNewFiles(false);
  }, [tab]);

  const handleFileSelect = useCallback(
    (path: string) => {
      openFile(path);
      setTab("code");
    },
    [openFile],
  );

  const handleRequestChange = useCallback(
    (filePath: string) => {
      setTab("chat");
      sendMessage(`Please review and improve the file: ${filePath}`);
    },
    [sendMessage],
  );

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
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
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

      <main className="flex-1 overflow-hidden pb-14">
        <div className={tab === "chat" ? "h-full" : "hidden"}>
          <ChatPanel
            messages={messages}
            streaming={streaming}
            tool={tool}
            onSend={sendMessage}
          />
        </div>
        <div className={tab === "files" ? "h-full" : "hidden"}>
          <FileExplorer
            files={files}
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
          />
        </div>
        <div className={tab === "code" ? "h-full" : "hidden"}>
          {selectedFile ? (
            <CodeViewer
              filePath={selectedFile}
              content={fileContent}
              loading={fileLoading}
              onClose={() => {
                closeFile();
                setTab("files");
              }}
              onRequestChange={handleRequestChange}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-sm gap-2">
              <p>No file selected</p>
              <button
                onClick={() => setTab("files")}
                className="text-blue-400 text-xs"
              >
                Open file explorer
              </button>
            </div>
          )}
        </div>
      </main>

      <BottomNav active={tab} onChange={setTab} hasNewFiles={hasNewFiles} />
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
