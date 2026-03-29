import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

const mainLayoutVariants = cva("flex min-h-0 w-full flex-col bg-background");

type MainLayoutProps = React.HTMLAttributes<HTMLDivElement>;

const MainLayout = React.forwardRef<HTMLDivElement, MainLayoutProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        className={cn(mainLayoutVariants({ className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
MainLayout.displayName = "MainLayout";

const MainContent = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <main
    ref={ref}
    className={cn("min-h-0 flex-1 overflow-x-hidden", className)}
    {...props}
  />
));
MainContent.displayName = "MainContent";

const PageTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h1
    ref={ref}
    className={cn("font-semibold tracking-tight py-4", className)}
    {...props}
  />
));
PageTitle.displayName = "PageTitle";

export { MainLayout, MainContent, PageTitle };
