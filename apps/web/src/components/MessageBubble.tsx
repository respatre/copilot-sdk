"use client";

interface Props {
  role: "user" | "assistant";
  content: string;
}

export default function MessageBubble({ role, content }: Props) {
  const isUser = role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-msg-in`}
    >
      <div
        className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser ? "bubble-sent text-white" : "bubble-received"
        }`}
        style={!isUser ? { color: "var(--text-primary)" } : undefined}
      >
        {isUser ? content : <AssistantContent content={content} />}
      </div>
    </div>
  );
}

function AssistantContent({ content }: { content: string }) {
  // Simple markdown: bold, inline code, code blocks
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`|\*\*[^*]+\*\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.slice(3, -3);
          const firstNewline = lines.indexOf("\n");
          const code =
            firstNewline >= 0 ? lines.slice(firstNewline + 1) : lines;
          return (
            <pre
              key={i}
              className="rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono"
              style={{
                background: "rgba(10, 10, 15, 0.6)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <code>{code}</code>
            </pre>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="px-1.5 py-0.5 rounded text-xs font-mono"
              style={{
                background: "var(--bg-input)",
                color: "var(--purple-400)",
              }}
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
