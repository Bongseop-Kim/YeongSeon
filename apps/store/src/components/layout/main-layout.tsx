import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const mainLayoutVariants = cva(
  "w-full bg-background flex flex-col"
);

export interface MainLayoutProps extends React.HTMLAttributes<HTMLDivElement> {}

const MainLayout = React.forwardRef<HTMLDivElement, MainLayoutProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        className={cn(mainLayoutVariants({ className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
MainLayout.displayName = "MainLayout";

const MainContent = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <main
    ref={ref}
    className={cn("flex-1 overflow-y-auto overflow-x-hidden", className)}
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

export {
  MainLayout,
  MainContent,
  PageTitle,
};
