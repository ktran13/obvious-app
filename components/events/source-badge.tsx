import { cn } from "cn";

import type { EventSource } from "./types";

type SourceBadgeProps = {
  source: EventSource;
  className?: string;
};

/**
 * Attribution pill naming the upstream listing source — a stamp-pill: 2px
 * ink outline on paper, ink-black text (was the muted shadcn pill).
 */
export function SourceBadge({ source, className }: SourceBadgeProps) {
  return (
    <span
      data-slot="source-badge"
      className={cn(
        "border-ink-black bg-card text-foreground inline-flex items-center rounded-full border-2 px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      via {source.label}
    </span>
  );
}
