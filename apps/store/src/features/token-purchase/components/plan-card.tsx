import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TokenPlanKey } from "@/features/token-purchase/api/token-purchase-api";

interface PlanCardProps {
  planKey: TokenPlanKey;
  label: string;
  price: number | null;
  tokenAmount: number | null;
  bonusAmount: number | null;
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
  bonusAmount,
  description,
  features,
  popular,
  selected,
  isPending,
  onSelect,
}: PlanCardProps) {
  const hasBonus = bonusAmount != null && bonusAmount > 0;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-white p-7 transition-all duration-200",
        popular
          ? "border-zinc-900 shadow-md hover:shadow-lg"
          : "border-zinc-200 hover:border-zinc-400 hover:shadow-sm"
      )}
    >
      {popular && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-1 text-xs font-semibold text-white">
          인기
        </span>
      )}

      {/* 플랜 이름 */}
      <p className="text-xl font-bold text-zinc-900">{label}</p>

      {/* 토큰 수량 */}
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold text-zinc-900">
          {tokenAmount != null ? tokenAmount.toLocaleString() : "–"}
        </span>
        <span className="text-sm text-zinc-500">토큰</span>
        {hasBonus && (
          <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            +{bonusAmount} 보너스
          </span>
        )}
      </div>

      {/* 가격 */}
      <div className="mt-2 flex items-end gap-1">
        <span className="text-4xl font-bold text-zinc-900">
          {price != null ? price.toLocaleString() : "–"}
        </span>
        <span className="mb-1 text-sm text-zinc-500">원</span>
      </div>

      {/* 설명 */}
      <p className="mt-2 text-sm text-zinc-500">{description}</p>

      {/* CTA 버튼 */}
      <Button
        className={cn("mt-6 w-full rounded-full", selected && "opacity-70")}
        variant={popular ? "default" : "outline"}
        disabled={selected && isPending}
        onClick={() => onSelect(planKey)}
      >
        {selected && isPending ? "준비 중..." : selected ? "선택됨" : "충전하기"}
      </Button>

      {/* 구분선 */}
      <hr className="my-6 border-zinc-100" />

      {/* 특징 리스트 */}
      <ul className="flex flex-col gap-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-zinc-700">
            <Check className="mt-0.5 size-4 shrink-0 text-zinc-900" />
            {feature}
          </li>
        ))}
        {hasBonus && (
          <li className="flex items-start gap-2.5 text-sm text-amber-700">
            <Check className="mt-0.5 size-4 shrink-0 text-amber-700" />
            보너스 {bonusAmount}토큰 추가 지급 (환불 불가)
          </li>
        )}
      </ul>
    </div>
  );
}
