import { cn } from "cn";

type AdSlotProps = {
  className?: string;
  label?: string;
};

/**
 * Visual placeholder for a future sponsored slot. Intentionally renders
 * no ad-network script, iframe, or request — monetization wiring is a
 * later phase.
 */
export function AdSlot({ className, label = "Ad slot" }: AdSlotProps) {
  return (
    <aside
      data-slot="ad-slot"
      aria-label={label}
      className={cn(
        "flex min-h-24 items-center justify-center rounded-xl border border-dashed border-border bg-muted/50 p-4 text-center",
        className,
      )}
    >
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground/80">
          Placeholder — no ad network is wired up.
        </p>
      </div>
    </aside>
  );
}
