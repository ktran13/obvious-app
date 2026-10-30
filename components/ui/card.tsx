import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "cn";

const cardVariants = cva(
  // Riso zine card: paper cream surface, 8px handmade radius, 1.5px ink
  // border (single source: --card-border). Hover tilt is a motion-pass concern.
  "bg-card text-card-foreground relative rounded-[var(--radius-card)] [border:var(--card-border)]",
  {
    variants: {
      // Torn-edge top is decorative — reserved for feature/marketing
      // surfaces, never directory list cards (texture-discipline rule).
      variant: {
        default: "",
        feature:
          "[clip-path:polygon(0_10px,4%_3px,9%_12px,15%_2px,22%_11px,30%_4px,38%_13px,46%_3px,54%_11px,62%_2px,70%_12px,78%_4px,86%_11px,93%_3px,100%_9px,100%_100%,0_100%)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type CardProps = React.ComponentProps<"div"> & VariantProps<typeof cardVariants> & {
  /**
   * Washi-tape pin slot: absolutely positioned decor anchored to the top
   * edge. Content, not styling — pass e.g. a tape strip or sticker node.
   */
  pin?: React.ReactNode;
};

function Card({ className, variant, pin, children, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant }), className)}
      {...props}
    >
      {pin ? (
        <div data-slot="card-pin" className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 -rotate-3">
          {pin}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-display text-lg leading-none font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("p-4 pt-0", className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center p-4 pt-0", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants };
