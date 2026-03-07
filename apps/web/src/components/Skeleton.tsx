"use client";

export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg animate-pulse ${className}`}
      style={{ background: "var(--bg-card)" }}
    />
  );
}

export function SkeletonProjectCard() {
  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <SkeletonLine className="h-5 w-2/3" />
      <div className="flex gap-2">
        <SkeletonLine className="h-3 w-16" />
        <SkeletonLine className="h-3 w-24" />
      </div>
    </div>
  );
}
