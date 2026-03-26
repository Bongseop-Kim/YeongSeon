import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const headerVariants = cva(
  "w-full text-white transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
  {
    variants: {
      size: {
        sm: "h-14",
        md: "h-16",
        lg: "h-20",
      },
      sticky: {
        true: "sticky top-0 z-50",
        false: "relative",
      },
      tone: {
        solid:
          "border-b border-white/12 bg-brand-surface-strong/96 shadow-[0_12px_32px_-24px_rgba(0,0,0,0.85)] backdrop-blur-md",
        overlay:
          "border-b border-transparent bg-gradient-to-b from-black/50 via-black/18 to-transparent shadow-none backdrop-blur-0",
      },
    },
    defaultVariants: {
      size: "md",
      sticky: true,
      tone: "solid",
    },
  },
);

interface HeaderProps
  extends
    React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof headerVariants> {}

const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({ className, size, sticky, tone, ...props }, ref) => {
    return (
      <header
        className={cn(headerVariants({ size, sticky, tone }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Header.displayName = "Header";

const HeaderContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "container mx-auto flex min-h-14 max-w-7xl items-center justify-between px-4 lg:px-8",
      className,
    )}
    {...props}
  />
));
HeaderContent.displayName = "HeaderContent";

const HeaderTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("font-bold tracking-tight text-white", className)}
    {...props}
  />
));
HeaderTitle.displayName = "HeaderTitle";

const HeaderNav = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn("flex items-center space-x-8", className)}
    {...props}
  />
));
HeaderNav.displayName = "HeaderNav";

const HeaderActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center space-x-4", className)}
    {...props}
  />
));
HeaderActions.displayName = "HeaderActions";

export { Header, HeaderContent, HeaderTitle, HeaderNav, HeaderActions };
