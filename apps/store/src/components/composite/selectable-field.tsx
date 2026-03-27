import type { ReactNode } from "react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface SelectableFieldProps {
  id: string;
  selected: boolean;
  disabled?: boolean;
  className?: string;
  variant?: "row" | "panel";
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  footer?: ReactNode;
  control: ReactNode;
  children?: ReactNode;
}

export function SelectableField({
  id,
  selected,
  disabled,
  className,
  variant = "row",
  eyebrow,
  title,
  description,
  meta,
  badge,
  footer,
  control,
  children,
}: SelectableFieldProps) {
  return (
    <FieldLabel
      htmlFor={id}
      className={cn(
        "w-full cursor-pointer rounded-xl border border-border bg-surface transition-colors hover:bg-surface-muted",
        variant === "panel" && "rounded-2xl",
        disabled && "cursor-not-allowed opacity-60",
        selected && "border-primary bg-primary/5",
        className,
      )}
    >
      <Field
        orientation="horizontal"
        className={cn(
          "w-full gap-4",
          variant === "panel"
            ? "items-start px-5 py-5 pr-4"
            : "min-h-[88px] items-center px-4 py-3",
        )}
      >
        {variant === "panel" ? (
          <>
            <FieldContent className="min-w-0 gap-3">
              {eyebrow ? (
                <p className="text-xs font-medium text-muted-foreground">
                  {eyebrow}
                </p>
              ) : null}
              {(title || badge) && (
                <div className="flex items-start justify-between gap-3">
                  {title ? <FieldTitle>{title}</FieldTitle> : null}
                  {badge ? <div className="shrink-0">{badge}</div> : null}
                </div>
              )}
              {description ? (
                <FieldDescription className="mt-0">
                  {description}
                </FieldDescription>
              ) : null}
              {meta ? (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {meta}
                </div>
              ) : null}
              {children}
              {footer ? (
                <div className="border-t border-border/70 pt-3">{footer}</div>
              ) : null}
            </FieldContent>
            <div className="shrink-0">{control}</div>
          </>
        ) : (
          <>
            <FieldContent className="min-w-0 gap-1">
              {eyebrow ? (
                <p className="text-xs font-medium text-muted-foreground">
                  {eyebrow}
                </p>
              ) : null}
              {title ? <FieldTitle>{title}</FieldTitle> : null}
              {description ? (
                <FieldDescription className="mt-0">
                  {description}
                </FieldDescription>
              ) : null}
              {meta ? (
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {meta}
                </div>
              ) : null}
              {children}
            </FieldContent>
            <div className="flex shrink-0 items-center gap-3">
              {(badge || footer) && (
                <div className="text-right">
                  {badge}
                  {footer}
                </div>
              )}
              {control}
            </div>
          </>
        )}
      </Field>
    </FieldLabel>
  );
}
