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

function SelectTrigger({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof BaseSelectTrigger> & {
  variant?: "default" | "borderless";
}) {
  return (
    <BaseSelectTrigger
      className={cn(
        variant === "borderless" && "border-0 shadow-none",
        className,
      )}
      {...props}
    />
  );
}

export { SelectTrigger };
