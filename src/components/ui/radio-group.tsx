import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { CircleIcon } from "lucide-react";
import { Label } from "@/components/ui/label";

import { cn } from "@/lib/utils";

interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioGroupProps
  extends React.ComponentProps<typeof RadioGroupPrimitive.Root> {
  options?: RadioOption[];
  namePrefix?: string;
}

function RadioGroup({
  className,
  options,
  namePrefix = "radio",
  children,
  ...props
}: RadioGroupProps) {
  if (options) {
    return (
      <RadioGroupPrimitive.Root
        data-slot="radio-group"
        className={cn("flex flex-col gap-2", className)}
        {...props}
      >
        {options.map((option, index) => {
          const id = `${namePrefix}-${option.value}-${index}`;
          return (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option.value}
                id={id}
                disabled={option.disabled}
              />
              <Label htmlFor={id} className="text-xs  text-zinc-600">
                {option.label}
              </Label>
            </div>
          );
        })}
      </RadioGroupPrimitive.Root>
    );
  }

  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    >
      {children}
    </RadioGroupPrimitive.Root>
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow,background-color] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-black data-[state=checked]:border-black",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <CircleIcon className="fill-white absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
