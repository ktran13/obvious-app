import { cn } from "cn";

type AdSlotProps = {
  className?: string;
  label?: string;
};

/**
 * Visual placeholder for a future sponsored slot. Intentionally renders
 * no ad-network script, iframe, or request — monetization wiring is a
 * later phase.
 *
 * Pasted-flyer treatment (deliverable 4): paper card with an ink border
 * and offset blue shadow, slapped on at a slight tilt, held by a strip of
 * washi tape, on a halftone-dot print background. The sponsor label is
 * set in Caveat, uppercased visually — the marker "SPONSORED" scrawl.
 */
export function AdSlot({ className, label = "Ad slot" }: AdSlotProps) {
  return (
    <aside
      data-slot="ad-slot"
      aria-label={label}
      className={cn(
        "border-ink-black dark:border-foreground/30 bg-card relative flex min-h-24 -rotate-1 items-center justify-center border-2 p-4 pt-5 text-center",
        "shadow-[3px_3px_0_0_var(--color-ink-blue)]",
        className,
      )}
    >
      {/* Washi tape strip holding the flyer up. */}
      <span
        aria-hidden
        className="bg-ink-yellow/80 absolute -top-2.5 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rotate-2 shadow-sm"
      />
      {/* Halftone-dot print background behind the flyer copy. */}
      <span aria-hidden className="riso-halftone absolute inset-0" />
      <div className="relative">
        <p className="font-hand text-ink-blue text-lg leading-none font-semibold tracking-wide uppercase">
          {label}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Placeholder — no ad network is wired up.
        </p>
      </div>
    </aside>
  );
}
