import { Check } from "lucide-react";
import type { TokenPlanKey } from "@/entities/token-purchase";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui-extended/button";

interface PlanCardProps {
  planKey: TokenPlanKey;
  label: string;
  price: number | null;
  tokenAmount: number | null;
  description: string;
  features: string[];
  popular?: boolean;
  selected: boolean;
  isPending: boolean;
  onSelect: (planKey: TokenPlanKey) => void;
}

export function PlanCard({
  planKey,
  label,
  price,
  tokenAmount,
  description,
  features,
  popular,
  selected,
  isPending,
  onSelect,
}: PlanCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-[1.5rem] border bg-card p-7 transition-all duration-200",
        popular
          ? "border-brand-surface shadow-[0_24px_60px_-32px_rgba(15,23,42,0.45)] hover:-translate-y-0.5"
          : "border-border/80 hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-[0_20px_48px_-32px_rgba(15,23,42,0.3)]",
      )}
    >
      {popular && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-surface px-4 py-1 text-xs font-semibold text-brand-paper">
          인기
        </span>
      )}

      <p className="text-xl font-bold text-foreground">{label}</p>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold text-foreground">
          {tokenAmount != null ? tokenAmount.toLocaleString() : "–"}
        </span>
        {tokenAmount != null && (
          <span className="text-sm text-foreground-muted">토큰</span>
        )}
      </div>

      <div className="mt-2 flex items-end gap-1">
        <span className="text-4xl font-bold text-foreground">
          {price != null ? price.toLocaleString() : "–"}
        </span>
        {price != null && (
          <span className="mb-1 text-sm text-foreground-muted">원</span>
        )}
      </div>

      <p className="mt-2 text-sm text-foreground-muted">{description}</p>

      <Button
        className={cn("mt-6 w-full rounded-full", selected && "opacity-70")}
        variant={popular ? "default" : "outline"}
        disabled={selected && isPending}
        onClick={() => onSelect(planKey)}
      >
        {selected && isPending
          ? "준비 중..."
          : selected
            ? "선택됨"
            : "충전하기"}
      </Button>

      <hr className="my-6 border-border/70" />

      <ul className="flex flex-col gap-3">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2.5 text-sm text-foreground-subtle"
          >
            <Check className="mt-0.5 size-4 shrink-0 text-brand-accent" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
