import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const containerVariants = cva(
  "w-full mx-auto px-4",
  {
    variants: {
      size: {
        sm: "max-w-screen-sm",
        md: "max-w-screen-md", 
        lg: "max-w-screen-lg",
        xl: "max-w-screen-xl",
        "2xl": "max-w-screen-2xl",
        full: "max-w-full",
      },
      padding: {
        none: "px-0",
        sm: "px-2",
        md: "px-4",
        lg: "px-6",
        xl: "px-8",
      },
    },
    defaultVariants: {
      size: "xl",
      padding: "md",
    },
  }
)

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, padding, ...props }, ref) => {
    return (
      <div
        className={cn(containerVariants({ size, padding, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Container.displayName = "Container"

export { Container, containerVariants }
