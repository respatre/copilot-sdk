"use client";

import { Check, Copy } from "lucide-react";
import { memo, useState } from "react";

interface Props {
  role: "user" | "assistant";
  content: string;
}

export default function MessageBubble({ role, content }: Props) {
  const isUser = role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-msg-in`}
      role="article"
      aria-label={isUser ? "Tu mensaje" : "Mensaje del asistente"}
    >
      <div
        className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed break-words ${
          isUser
            ? "bubble-sent text-white whitespace-pre-wrap"
            : "bubble-received"
        }`}
        style={!isUser ? { color: "var(--text-primary)" } : undefined}
      >
        {isUser ? content : <AssistantContent content={content} />}
      </div>
    </div>
  );
}

/* ─── Code block with copy button ─── */
const CodeBlock = memo(function CodeBlock({
  code,
  lang,
}: {
  code: string;
  lang: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="relative group my-2 rounded-lg overflow-hidden"
      style={{
        background: "rgba(10, 10, 15, 0.6)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-1"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span
          className="text-[10px] font-mono"
          style={{ color: "var(--text-muted)" }}
        >
          {lang || "código"}
        </span>
        <button
          onClick={handleCopy}
          className="p-1 rounded transition-colors"
          style={{ color: "var(--text-muted)" }}
          aria-label={copied ? "Copiado" : "Copiar código"}
        >
          {copied ? (
            <Check size={12} style={{ color: "#22c55e" }} />
          ) : (
            <Copy size={12} />
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs font-mono whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
});

/* ─── Inline text parser (bold, italic, inline code, links) ─── */
function parseInline(text: string, keyPrefix: string) {
  const parts = text.split(
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/g,
  );
  const result: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p) continue;

    if (p.startsWith("**") && p.endsWith("**")) {
      result.push(<strong key={`${keyPrefix}-${i}`}>{p.slice(2, -2)}</strong>);
    } else if (p.startsWith("*") && p.endsWith("*") && !p.startsWith("**")) {
      result.push(<em key={`${keyPrefix}-${i}`}>{p.slice(1, -1)}</em>);
    } else if (p.startsWith("`") && p.endsWith("`")) {
      result.push(
        <code
          key={`${keyPrefix}-${i}`}
          className="px-1.5 py-0.5 rounded text-xs font-mono"
          style={{ background: "var(--bg-input)", color: "var(--purple-400)" }}
        >
          {p.slice(1, -1)}
        </code>,
      );
    } else if (p.startsWith("[")) {
      // Link: consume the next two captured groups
      const linkText = parts[i + 1];
      const linkUrl = parts[i + 2];
      if (linkText && linkUrl) {
        result.push(
          <a
            key={`${keyPrefix}-${i}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: "var(--blue-400)" }}
          >
            {linkText}
          </a>,
        );
        i += 2; // skip captured groups
      }
    } else {
      result.push(<span key={`${keyPrefix}-${i}`}>{p}</span>);
    }
  }
  return result;
}

/* ─── Full markdown renderer ─── */
function AssistantContent({ content }: { content: string }) {
  // Split by code blocks first
  const blocks = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-1">
      {blocks.map((block, bi) => {
        // Code blocks
        if (block.startsWith("```") && block.endsWith("```")) {
          const inner = block.slice(3, -3);
          const firstNewline = inner.indexOf("\n");
          const lang =
            firstNewline >= 0 ? inner.slice(0, firstNewline).trim() : "";
          const code =
            firstNewline >= 0 ? inner.slice(firstNewline + 1) : inner;
          return <CodeBlock key={bi} code={code} lang={lang} />;
        }

        // Process text block line-by-line for headers, lists, etc.
        const lines = block.split("\n");
        const elements: React.ReactNode[] = [];
        let listItems: React.ReactNode[] = [];
        let listType: "ul" | "ol" | null = null;

        const flushList = () => {
          if (listItems.length > 0 && listType) {
            const Tag = listType;
            elements.push(
              <Tag
                key={`list-${elements.length}`}
                className={`${listType === "ul" ? "list-disc" : "list-decimal"} pl-5 space-y-0.5`}
              >
                {listItems}
              </Tag>,
            );
            listItems = [];
            listType = null;
          }
        };

        for (let li = 0; li < lines.length; li++) {
          const line = lines[li];
          const lineKey = `${bi}-${li}`;

          // Headers
          const headerMatch = line.match(/^(#{1,4})\s+(.+)/);
          if (headerMatch) {
            flushList();
            const level = headerMatch[1].length;
            const sizes = [
              "text-lg font-bold",
              "text-base font-semibold",
              "text-sm font-semibold",
              "text-sm font-medium",
            ];
            elements.push(
              <div key={lineKey} className={`${sizes[level - 1]} mt-2 mb-0.5`}>
                {parseInline(headerMatch[2], lineKey)}
              </div>,
            );
            continue;
          }

          // Unordered list
          const ulMatch = line.match(/^(\s*)[*\-+]\s+(.+)/);
          if (ulMatch) {
            if (listType !== "ul") {
              flushList();
              listType = "ul";
            }
            listItems.push(
              <li key={lineKey}>{parseInline(ulMatch[2], lineKey)}</li>,
            );
            continue;
          }

          // Ordered list
          const olMatch = line.match(/^(\s*)\d+[.)]\s+(.+)/);
          if (olMatch) {
            if (listType !== "ol") {
              flushList();
              listType = "ol";
            }
            listItems.push(
              <li key={lineKey}>{parseInline(olMatch[2], lineKey)}</li>,
            );
            continue;
          }

          // Horizontal rule
          if (/^---+$/.test(line.trim())) {
            flushList();
            elements.push(
              <hr
                key={lineKey}
                className="my-2"
                style={{ borderColor: "var(--border-subtle)" }}
              />,
            );
            continue;
          }

          // Empty line
          if (line.trim() === "") {
            flushList();
            continue;
          }

          // Normal paragraph
          flushList();
          elements.push(
            <p key={lineKey} className="whitespace-pre-wrap">
              {parseInline(line, lineKey)}
            </p>,
          );
        }

        flushList();
        return <div key={bi}>{elements}</div>;
      })}
    </div>
  );
}
