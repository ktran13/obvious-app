import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "cn";

const inputVariants = cva(
  // Riso zine input: 2px ink outline on paper, riso-blue focus ring —
  // matches the stamp-pill family.
  "border-ink-black bg-card text-foreground placeholder:text-muted-foreground inline-flex h-9 w-full min-w-0 rounded-[var(--radius-card)] border-2 px-3 text-sm transition-colors outline-none select-none focus-visible:border-ink-blue focus-visible:ring-3 focus-visible:ring-ink-blue/30 aria-invalid:border-ink-red aria-invalid:ring-3 aria-invalid:ring-ink-red/20 disabled:pointer-events-none disabled:opacity-50 file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium dark:aria-invalid:ring-ink-red/40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {},
    defaultVariants: {},
  },
);

type InputProps = React.ComponentProps<"input"> & VariantProps<typeof inputVariants>;

function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({}), className)}
      {...props}
    />
  );
}

export { Input, inputVariants };
