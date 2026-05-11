import {
  Children,
  isValidElement,
  cloneElement,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/shared/lib/utils";

interface SummaryCardRootProps {
  children: ReactNode;
  className?: string;
}

function SummaryCardRoot({ children, className }: SummaryCardRootProps) {
  let hasSeenSection = false;
  const normalizedChildren = Children.map(children, (child) => {
    if (isValidElement<SummaryCardSectionProps>(child)) {
      const isSection = child.type === SummaryCardSection;
      if (isSection) {
        const isFirstSection = !hasSeenSection;
        hasSeenSection = true;
        return cloneElement(child as ReactElement<SummaryCardSectionProps>, {
          isFirstSection,
        });
      }
    }

    return child;
  });

  return (
    <section
      className={cn("border border-border bg-background p-5", className)}
    >
      {normalizedChildren}
    </section>
  );
}

interface SummaryCardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}

function SummaryCardHeader({
  title,
  description,
  className,
}: SummaryCardHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-border pb-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-base font-semibold leading-6 text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-foreground-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

interface SummaryCardSectionProps {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  isFirstSection?: boolean;
}

function SummaryCardSection({
  title,
  children,
  className,
  isFirstSection,
}: SummaryCardSectionProps) {
  return (
    <section
      className={cn(
        "mt-4",
        isFirstSection ? "border-t-0 pt-0" : "border-t border-border pt-4",
        className,
      )}
    >
      {title ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-foreground-muted">
          {title}
        </p>
      ) : null}
      {children}
    </section>
  );
}

interface SummaryCardRowProps {
  label: ReactNode;
  value: ReactNode;
  muted?: boolean;
  className?: string;
  valueClassName?: string;
}

function SummaryCardRow({
  label,
  value,
  muted,
  className,
  valueClassName,
}: SummaryCardRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-1.5 text-sm leading-6",
        className,
      )}
    >
      <dt className="text-foreground-muted">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right font-medium text-foreground",
          muted && "font-normal text-foreground-muted",
          valueClassName,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

interface SummaryCardTotalProps {
  label: ReactNode;
  value: ReactNode;
  className?: string;
  valueClassName?: string;
}

function SummaryCardTotal({
  label,
  value,
  className,
  valueClassName,
}: SummaryCardTotalProps) {
  return (
    <div
      className={cn(
        "mt-2 flex items-center justify-between gap-4 border-t border-border pt-3",
        className,
      )}
    >
      <dt className="text-sm font-semibold text-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right text-lg font-bold leading-6 text-foreground",
          valueClassName,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

interface SummaryCardControlProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "value"
> {
  label: ReactNode;
  trailing?: ReactNode;
}

function SummaryCardControl({
  label,
  trailing,
  className,
  type = "button",
  ...props
}: SummaryCardControlProps) {
  return (
    <button
      type={type}
      className={cn(
        "flex w-full items-center justify-between gap-3 border border-border bg-background px-3 py-2.5 text-left text-sm leading-5 text-foreground-muted",
        className,
      )}
      {...props}
    >
      <span>{label}</span>
      {trailing ? (
        <strong className="font-semibold text-foreground">{trailing}</strong>
      ) : null}
    </button>
  );
}

interface SummaryCardConsentProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

function SummaryCardConsent({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  className,
  ...props
}: SummaryCardConsentProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[18px_minmax(0,1fr)] items-start gap-2.5 border border-border bg-muted/30 p-3",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.currentTarget.checked)}
        className="mt-0.5 size-[18px] accent-blue-700"
        {...props}
      />
      <div className="min-w-0">
        <label
          htmlFor={id}
          className="text-sm font-semibold leading-6 text-foreground"
        >
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 text-xs leading-5 text-foreground-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

interface SummaryCardNoticeListProps {
  label?: ReactNode;
  items: ReactNode[];
  className?: string;
}

function SummaryCardNoticeList({
  label,
  items,
  className,
}: SummaryCardNoticeListProps) {
  return (
    <div className={className}>
      {label ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-foreground-muted">
          {label}
        </p>
      ) : null}
      <ul className="space-y-1.5 text-xs leading-5 text-foreground-muted">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export const SummaryCard = Object.assign(SummaryCardRoot, {
  Header: SummaryCardHeader,
  Section: SummaryCardSection,
  Row: SummaryCardRow,
  Total: SummaryCardTotal,
  Control: SummaryCardControl,
  Consent: SummaryCardConsent,
  NoticeList: SummaryCardNoticeList,
});
