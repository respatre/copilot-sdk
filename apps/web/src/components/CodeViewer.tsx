"use client";

import { Check, Copy, MessageSquare, X } from "lucide-react";
import Prism from "prismjs";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-css";
import "prismjs/components/prism-go";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-json";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-python";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-yaml";
import { useEffect, useRef, useState } from "react";

interface Props {
  filePath: string;
  content: string;
  loading: boolean;
  onClose: () => void;
  onRequestChange: (filePath: string) => void;
}

const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  json: "json",
  css: "css",
  py: "python",
  sh: "bash",
  bash: "bash",
  yaml: "yaml",
  yml: "yaml",
  md: "markdown",
  sql: "sql",
  go: "go",
  html: "markup",
};

export default function CodeViewer({
  filePath,
  content,
  loading,
  onClose,
  onRequestChange,
}: Props) {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const lang = EXT_TO_LANG[ext] ?? "plaintext";

  useEffect(() => {
    if (codeRef.current && content) {
      Prism.highlightElement(codeRef.current);
    }
  }, [content, lang]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-full text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        Loading...
      </div>
    );
  }

  if (!content) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full text-sm gap-2"
        style={{ color: "var(--text-muted)" }}
      >
        <p>Empty file</p>
      </div>
    );
  }

  const fileName = filePath.split("/").pop() ?? filePath;
  const lines = content.split("\n");

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--bg-primary)" }}
      role="region"
      aria-label={`Code viewer: ${fileName}`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-xs truncate font-mono"
            style={{ color: "var(--text-secondary)" }}
          >
            {filePath}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded transition-colors"
            style={{ color: copied ? "#22c55e" : "var(--text-muted)" }}
            aria-label={copied ? "Copied" : "Copy file contents"}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button
            onClick={() => onRequestChange(filePath)}
            className="p-1.5 rounded transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label="Request change in chat"
          >
            <MessageSquare size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close file"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Code */}
      <div
        className="flex-1 overflow-auto"
        style={{ background: "var(--bg-primary)" }}
      >
        <div className="flex text-xs font-mono">
          {/* Line numbers */}
          <div
            className="select-none text-right pr-3 pl-3 py-3 sticky left-0"
            style={{
              color: "var(--text-muted)",
              background: "var(--bg-secondary)",
              borderRight: "1px solid var(--border-subtle)",
            }}
          >
            {lines.map((_, i) => (
              <div key={i} className="leading-5">
                {i + 1}
              </div>
            ))}
          </div>
          {/* Code content */}
          <pre
            className="flex-1 py-3 pl-4 pr-4 overflow-x-auto m-0 bg-transparent"
            style={{ color: "var(--text-primary)" }}
          >
            <code ref={codeRef} className={`language-${lang}`}>
              {content}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
