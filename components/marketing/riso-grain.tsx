import { cn } from "cn";

type RisoGrainProps = {
  className?: string;
};

/**
 * Riso grain texture overlay (deliverable 4). Presentational, server-safe:
 * a repeated SVG tile whose intensity is the single --grain-opacity token
 * (0.06 light / 0.04 dark — zeroing the var removes the grain entirely).
 * Marketing surfaces only; never inside dense directory cards
 * (texture-discipline rule). Decorative: aria-hidden, pointer-events-none.
 */
export function RisoGrain({ className }: RisoGrainProps) {
  return (
    <div
      aria-hidden
      data-slot="riso-grain"
      className={cn("pointer-events-none absolute inset-0 bg-repeat", className)}
      style={{
        backgroundImage: "url('/textures/riso-grain.svg')",
        opacity: "var(--grain-opacity)",
      }}
    />
  );
}
