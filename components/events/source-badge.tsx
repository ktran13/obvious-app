import { Badge } from "@/components/ui/badge";

import type { EventSource } from "./types";

type SourceBadgeProps = {
  source: EventSource;
  className?: string;
};

/**
 * Attribution pill naming the upstream listing source — the rounded
 * ink-colored stamp pill, composed from the ui/badge primitive (2px ink
 * outline on paper, ink-black text).
 */
export function SourceBadge({ source, className }: SourceBadgeProps) {
  return (
    <Badge data-slot="source-badge" variant="outline" className={className}>
      via {source.label}
    </Badge>
  );
}
