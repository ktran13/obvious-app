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
        "border-border bg-muted/50 flex min-h-24 items-center justify-center rounded-xl border border-dashed p-4 text-center",
        className,
      )}
    >
      <div>
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <p className="text-muted-foreground/80 text-xs">Placeholder — no ad network is wired up.</p>
      </div>
    </aside>
  );
}
