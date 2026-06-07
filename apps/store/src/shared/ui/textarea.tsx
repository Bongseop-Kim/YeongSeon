import * as React from "react";

import { cn } from "@/shared/lib/utils";

interface TextareaProps extends React.ComponentProps<"textarea"> {
  minHeight?: "default" | "large";
}

function Textarea({
  className,
  maxLength,
  minHeight = "default",
  ...props
}: TextareaProps) {
  const [value, setValue] = React.useState(
    props.defaultValue || props.value || "",
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    props.onChange?.(e);
  };

  return (
    <div className="relative">
      <textarea
        data-slot="textarea"
        className={cn(
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-sm border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          minHeight === "large" && "min-h-24",
          maxLength && "pb-7",
          className,
        )}
        maxLength={maxLength}
        {...props}
        onChange={handleChange}
      />
      {maxLength && (
        <div className="absolute bottom-2 right-3 text-xs text-zinc-400">
          {String(value).length} / {maxLength}
        </div>
      )}
    </div>
  );
}

export { Textarea };
