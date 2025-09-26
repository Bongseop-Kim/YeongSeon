import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

interface LabelProps extends React.ComponentProps<typeof LabelPrimitive.Root> {
  subLabel?: string | React.ReactNode;
}

const baseClassName =
  "flex text-stone-900 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50";

function Label({ className, subLabel, ...props }: LabelProps) {
  const labelId = React.useId();

  if (subLabel) {
    return (
      <div className="space-y-1">
        <LabelPrimitive.Root
          data-slot="label"
          className={cn(baseClassName, className)}
          {...props}
        />
        <p
          className="text-xs text-stone-500 mt-1"
          id={`${labelId}-sublabel`}
          aria-describedby={props.htmlFor}
        >
          {subLabel}
        </p>
      </div>
    );
  }

  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(baseClassName, className)}
      {...props}
    />
  );
}

export { Label };
