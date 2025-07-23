import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const flexVariants = cva(
  "flex",
  {
    variants: {
      direction: {
        row: "flex-row",
        col: "flex-col",
        "row-reverse": "flex-row-reverse",
        "col-reverse": "flex-col-reverse",
      },
      align: {
        start: "items-start",
        center: "items-center",
        end: "items-end",
        stretch: "items-stretch",
        baseline: "items-baseline",
      },
      justify: {
        start: "justify-start",
        center: "justify-center",
        end: "justify-end",
        between: "justify-between",
        around: "justify-around",
        evenly: "justify-evenly",
      },
      wrap: {
        nowrap: "flex-nowrap",
        wrap: "flex-wrap",
        "wrap-reverse": "flex-wrap-reverse",
      },
      gap: {
        0: "gap-0",
        1: "gap-1",
        2: "gap-2",
        3: "gap-3",
        4: "gap-4",
        6: "gap-6",
        8: "gap-8",
      },
    },
    defaultVariants: {
      direction: "row",
      align: "start",
      justify: "start",
      wrap: "nowrap",
      gap: 0,
    },
  }
)

export interface FlexProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof flexVariants> {}

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({ className, direction, align, justify, wrap, gap, ...props }, ref) => {
    return (
      <div
        className={cn(flexVariants({ direction, align, justify, wrap, gap, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Flex.displayName = "Flex"

const FlexItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    flex?: "1" | "auto" | "initial" | "none"
    grow?: boolean
    shrink?: boolean
  }
>(({ className, flex, grow, shrink, ...props }, ref) => {
  const flexClass = flex ? `flex-${flex}` : ""
  const growClass = grow ? "flex-grow" : ""
  const shrinkClass = shrink ? "flex-shrink" : ""
  
  return (
    <div
      ref={ref}
      className={cn(flexClass, growClass, shrinkClass, className)}
      {...props}
    />
  )
})
FlexItem.displayName = "FlexItem"

export { Flex, FlexItem, flexVariants }
