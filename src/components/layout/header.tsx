import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const headerVariants = cva(
  "w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
  {
    variants: {
      variant: {
        default: "border-border",
        ghost: "border-transparent",
        solid: "bg-background border-border",
      },
      size: {
        sm: "h-12",
        md: "h-16",
        lg: "h-20",
      },
      sticky: {
        true: "sticky top-0 z-50",
        false: "relative",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      sticky: true,
    },
  }
);

export interface HeaderProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof headerVariants> {}

const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({ className, variant, size, sticky, ...props }, ref) => {
    return (
      <header
        className={cn(headerVariants({ variant, size, sticky, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Header.displayName = "Header";

const HeaderContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "container flex h-full items-center justify-between px-4",
      className
    )}
    {...props}
  />
));
HeaderContent.displayName = "HeaderContent";

const HeaderTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h1 ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
));
HeaderTitle.displayName = "HeaderTitle";

const HeaderNav = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn("flex items-center space-x-4", className)}
    {...props}
  />
));
HeaderNav.displayName = "HeaderNav";

export { Header, HeaderContent, HeaderTitle, HeaderNav, headerVariants };
