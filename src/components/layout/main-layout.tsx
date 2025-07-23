import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const mainLayoutVariants = cva(
  "min-h-screen bg-background",
  {
    variants: {
      layout: {
        default: "flex flex-col",
        sidebar: "flex",
        "sidebar-right": "flex flex-row-reverse",
      },
    },
    defaultVariants: {
      layout: "default",
    },
  }
)

export interface MainLayoutProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof mainLayoutVariants> {}

const MainLayout = React.forwardRef<HTMLDivElement, MainLayoutProps>(
  ({ className, layout, ...props }, ref) => {
    return (
      <div
        className={cn(mainLayoutVariants({ layout, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
MainLayout.displayName = "MainLayout"

const MainContent = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <main
    ref={ref}
    className={cn("flex-1 overflow-auto", className)}
    {...props}
  />
))
MainContent.displayName = "MainContent"

const PageHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("border-b bg-background px-6 py-4", className)}
    {...props}
  />
))
PageHeader.displayName = "PageHeader"

const PageTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h1
    ref={ref}
    className={cn("text-2xl font-bold tracking-tight", className)}
    {...props}
  />
))
PageTitle.displayName = "PageTitle"

const PageDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-muted-foreground", className)}
    {...props}
  />
))
PageDescription.displayName = "PageDescription"

const PageContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 p-6", className)}
    {...props}
  />
))
PageContent.displayName = "PageContent"

export { 
  MainLayout, 
  MainContent, 
  PageHeader, 
  PageTitle, 
  PageDescription, 
  PageContent,
  mainLayoutVariants 
}
