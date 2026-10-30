import { cn } from "cn";

import type { EventSource } from "./types";

type SourceBadgeProps = {
  source: EventSource;
  className?: string;
};

/** Attribution pill naming the upstream listing source. */
export function SourceBadge({ source, className }: SourceBadgeProps) {
  return (
    <span
      data-slot="source-badge"
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      via {source.label}
    </span>
  );
}
