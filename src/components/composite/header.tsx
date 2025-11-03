import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const headerVariants = cva("w-full bg-zinc-200 backdrop-blur-md", {
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
  },
  defaultVariants: {
    size: "md",
    sticky: true,
  },
});

export interface HeaderProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof headerVariants> {}

const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({ className, size, sticky, ...props }, ref) => {
    return (
      <header
        className={cn(headerVariants({ size, sticky }), className)}
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
      "container mx-auto flex h-full max-w-7xl items-center justify-between px-4 lg:px-8",
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
  <h2
    ref={ref}
    className={cn("font-bold tracking-tight text-gray-900", className)}
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

export {
  Header,
  HeaderContent,
  HeaderTitle,
  HeaderNav,
  HeaderActions,
  headerVariants,
};
