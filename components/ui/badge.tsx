import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "cn";

const badgeVariants = cva(
  // Stamp pill: 2px ink outline, inline-flex, no rounded-square defaults.
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border-2 border-ink-black dark:border-foreground/30 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      variant: {
        // Unselected stamp: paper fill, ink outline.
        outline: "bg-card text-foreground",
        // Selected stamp: riso fluorescent magenta fill. Text is ink-black,
        // never white (contrast lock L3: ~5.9:1 on #FF48B0, WCAG AA pass).
        selected: "bg-ink-magenta text-ink-black",
        // FREE/TONIGHT sticker: starburst clip, magenta fill, ink text.
        starburst:
          "bg-ink-magenta text-ink-black rounded-none border-0 px-3 py-2 [clip-path:polygon(50%_0%,59%_13%,74%_8%,77%_24%,93%_24%,86%_39%,100%_50%,86%_61%,93%_76%,77%_76%,74%_92%,59%_87%,50%_100%,41%_87%,26%_92%,23%_76%,7%_76%,14%_61%,0%_50%,14%_39%,7%_24%,23%_24%,26%_8%,41%_13%)]",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
