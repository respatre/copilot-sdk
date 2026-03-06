"use client";

import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react";
import { useState } from "react";
import type { FileNode } from "../lib/api";

interface Props {
  files: FileNode[];
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
}

export default function FileExplorer({
  files,
  onFileSelect,
  selectedFile,
}: Props) {
  if (files.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full text-sm gap-2 px-4"
        style={{ color: "var(--text-muted)" }}
      >
        <Folder size={32} style={{ color: "var(--text-muted)" }} />
        <p>No files yet</p>
        <p
          className="text-xs text-center"
          style={{ color: "var(--text-muted)" }}
        >
          Start chatting to generate your project files
        </p>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-y-auto px-2 py-3"
      style={{ background: "var(--bg-primary)" }}
    >
      {files.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          onSelect={onFileSelect}
          selected={selectedFile}
        />
      ))}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  onSelect,
  selected,
}: {
  node: FileNode;
  depth: number;
  onSelect: (path: string) => void;
  selected: string | null;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isDir = node.type === "directory";
  const isSelected = node.path === selected;

  const handleClick = () => {
    if (isDir) {
      setOpen(!open);
    } else {
      onSelect(node.path);
    }
  };

  const ext = node.name.split(".").pop()?.toLowerCase() ?? "";
  const iconColor = getFileColor(ext);

  return (
    <div>
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm transition-colors"
        style={{
          paddingLeft: `${depth * 16 + 8}px`,
          color: isSelected ? "var(--purple-400)" : "var(--text-secondary)",
          background: isSelected ? "rgba(168, 85, 247, 0.1)" : "transparent",
        }}
      >
        {isDir ? (
          <>
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {open ? (
              <FolderOpen size={14} className="text-yellow-400 shrink-0" />
            ) : (
              <Folder size={14} className="text-yellow-400 shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5" />
            <FileText size={14} className={`${iconColor} shrink-0`} />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isDir &&
        open &&
        node.children?.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
            selected={selected}
          />
        ))}
    </div>
  );
}

function getFileColor(ext: string): string {
  const colors: Record<string, string> = {
    ts: "text-blue-400",
    tsx: "text-blue-400",
    js: "text-yellow-300",
    jsx: "text-yellow-300",
    json: "text-yellow-500",
    md: "text-zinc-400",
    css: "text-purple-400",
    html: "text-orange-400",
    py: "text-green-400",
    go: "text-cyan-400",
    rs: "text-orange-500",
    yaml: "text-pink-400",
    yml: "text-pink-400",
    toml: "text-pink-400",
    sh: "text-green-300",
    sql: "text-blue-300",
  };
  return colors[ext] ?? "text-zinc-400";
}
