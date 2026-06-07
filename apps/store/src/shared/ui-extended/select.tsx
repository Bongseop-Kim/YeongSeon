import * as React from "react";

import { cn } from "@/shared/lib/utils";
import { SelectTrigger as BaseSelectTrigger } from "@/shared/ui/select";

export {
  Select,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/shared/ui/select";

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof BaseSelectTrigger>,
  React.ComponentPropsWithoutRef<typeof BaseSelectTrigger> & {
    variant?: "default" | "borderless" | "sort";
  }
>(({ className, variant = "default", ...props }, ref) => {
  return (
    <BaseSelectTrigger
      ref={ref}
      className={cn(
        variant === "borderless" && "border-0 shadow-none",
        variant === "sort" &&
          "w-[112px] rounded-lg border-zinc-200 bg-white text-base font-medium text-zinc-700 shadow-none md:text-sm",
        className,
      )}
      {...props}
    />
  );
});

SelectTrigger.displayName = "SelectTrigger";

export { SelectTrigger };
