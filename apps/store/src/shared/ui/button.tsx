import * as React from "react";
import { Slot as SlotPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs dark:bg-input/30 dark:border-input",
        secondary: "bg-secondary text-secondary-foreground",
        ghost: "bg-accent text-accent-foreground dark:bg-accent/50",
        link: "text-primary underline underline-offset-4 decoration-primary/30",
        text: "text-foreground underline underline-offset-4",
        none: "border-none bg-transparent shadow-none",
        kakao:
          "border border-brand-kakao bg-brand-kakao text-brand-ink hover:bg-brand-kakao-hover focus-visible:ring-brand-kakao",
        "filter-chip":
          "border! border-solid border-zinc-200! bg-white text-zinc-700 shadow-none hover:bg-zinc-50",
        "filter-chip-active":
          "border! border-solid border-zinc-900! bg-zinc-900 text-white shadow-none hover:bg-zinc-800",
        "filter-reset":
          "border-none bg-transparent text-zinc-700 shadow-none hover:bg-zinc-50",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-sm gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-sm px-6 has-[>svg]:px-4",
        xl: "h-12 rounded-sm px-8 has-[>svg]:px-6",
        filter: "h-9 rounded-full gap-2 px-4 text-sm",
        "filter-reset": "h-9 rounded-full px-3 text-sm",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? SlotPrimitive.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
