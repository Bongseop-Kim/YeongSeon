import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRightIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface UtilityPageIntroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function UtilityPageIntro({
  eyebrow,
  title,
  description,
  meta,
  actions,
  className,
}: UtilityPageIntroProps) {
  return (
    <section
      className={cn(
        "border-b border-stone-200 px-4 pb-6 pt-2 lg:px-0 lg:pb-8 lg:pt-4",
        className,
      )}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-zinc-950 lg:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 text-sm leading-7 text-zinc-600 lg:text-[15px]">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {meta ? <div className="mt-5">{meta}</div> : null}
    </section>
  );
}

interface UtilityPageSectionProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function UtilityPageSection({
  icon: Icon,
  title,
  description,
  children,
  className,
}: UtilityPageSectionProps) {
  return (
    <section className={cn("px-4 lg:px-0", className)}>
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="size-4 text-zinc-500" /> : null}
        <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
          {title}
        </h2>
      </div>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          {description}
        </p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

interface UtilityPageAsideProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  tone?: "default" | "muted" | "danger";
  className?: string;
}

const asideToneClassName = {
  default: "border-b border-stone-200 bg-transparent",
  muted: "rounded-xl border border-stone-200 bg-stone-50/70",
  danger: "rounded-xl border border-red-200 bg-red-50/80",
} as const;

export function UtilityPageAside({
  icon: Icon,
  title,
  description,
  children,
  tone = "default",
  className,
}: UtilityPageAsideProps) {
  return (
    <aside className={cn("p-4 lg:p-5", asideToneClassName[tone], className)}>
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="size-4 text-zinc-500" /> : null}
        <h3 className="text-base font-semibold text-zinc-950">{title}</h3>
      </div>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </aside>
  );
}

interface UtilityLinkRowProps {
  label: string;
  description?: string;
  meta?: string;
  onClick: () => void;
  className?: string;
}

export function UtilityLinkRow({
  label,
  description,
  meta,
  onClick,
  className,
}: UtilityLinkRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full appearance-none items-center justify-between gap-4 rounded-none border-0 border-b border-stone-200 bg-transparent py-4 text-left shadow-none transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-950">{label}</p>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 self-center text-zinc-400">
        {meta ? (
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 sm:inline">
            {meta}
          </span>
        ) : null}
        <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

interface UtilityLinkListProps {
  children: ReactNode;
  className?: string;
}

export function UtilityLinkList({ children, className }: UtilityLinkListProps) {
  return (
    <div className={cn("[&>*:last-child]:border-b-0", className)}>
      {children}
    </div>
  );
}

interface UtilityStatListProps {
  items: Array<{
    label: string;
    value: string;
  }>;
  className?: string;
}

export function UtilityStatList({ items, className }: UtilityStatListProps) {
  return (
    <dl className={cn("space-y-4", className)}>
      {items.map((item, index) => (
        <div key={item.label}>
          {index > 0 ? <Separator className="mb-4" /> : null}
          <dt className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
            {item.label}
          </dt>
          <dd className="mt-2 text-sm font-medium text-zinc-950">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface UtilityKeyValueRowProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function UtilityKeyValueRow({
  label,
  value,
  className,
}: UtilityKeyValueRowProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-stone-200 py-3 last:border-b-0",
        className,
      )}
    >
      <dt className="shrink-0 text-sm text-zinc-500">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-zinc-950">
        {value}
      </dd>
    </div>
  );
}
