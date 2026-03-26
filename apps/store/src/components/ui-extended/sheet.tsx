import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { SheetPortal, SheetOverlay } from "@/components/ui/sheet";

export {
  Sheet,
  SheetTrigger,
  SheetHeader,
  SheetFooter,
  SheetTitle,
} from "@/components/ui/sheet";

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
    side?: "top" | "right" | "bottom" | "left";
    variant?: "default" | "minimal";
  }
>(
  (
    { className, children, side = "right", variant = "default", ...props },
    ref,
  ) => {
    const showDragHandle = side === "bottom" || variant === "minimal";
    const showCloseButton = !showDragHandle && variant === "default";

    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content
          ref={ref}
          data-slot="sheet-content"
          className={cn(
            "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
            side === "right" &&
              "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 sm:max-w-sm",
            side === "left" &&
              "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
            side === "top" &&
              "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto",
            side === "bottom" &&
              "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
            className,
          )}
          style={
            side === "bottom"
              ? {
                  paddingBottom:
                    "calc(0.5rem + env(safe-area-inset-bottom, 0))",
                }
              : undefined
          }
          {...props}
        >
          {showDragHandle && (
            <div className="mx-auto mt-2 h-1 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
          )}
          {children}
          {showCloseButton && (
            <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
              <XIcon className="size-4 text-zinc-50" />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          )}
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);

SheetContent.displayName = SheetPrimitive.Content.displayName;

export { SheetContent };
