import * as React from "react";

import { cn } from "@/lib/utils";
import { SelectTrigger as BaseSelectTrigger } from "@/components/ui/select";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "@/components/ui/select";

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof BaseSelectTrigger>,
  React.ComponentPropsWithoutRef<typeof BaseSelectTrigger> & {
    variant?: "default" | "borderless";
  }
>(({ className, variant = "default", ...props }, ref) => {
  return (
    <BaseSelectTrigger
      ref={ref}
      className={cn(
        variant === "borderless" && "border-0 shadow-none",
        className,
      )}
      {...props}
    />
  );
});

SelectTrigger.displayName = "SelectTrigger";

export { SelectTrigger };
