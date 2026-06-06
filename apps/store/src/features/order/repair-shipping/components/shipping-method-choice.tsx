import type { ReactNode } from "react";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { FieldDescription, FieldTitle } from "@/shared/ui/field";
import { cn } from "@/shared/lib/utils";

export type RepairShippingMethod = "direct" | "pickup";

interface MethodCardProps {
  id: string;
  value: RepairShippingMethod;
  selected: boolean;
  title: string;
  description: string;
  badge?: ReactNode;
  children?: ReactNode;
}

/**
 * ChoicePanel과 같은 시각 문법(rounded-xl border, 선택 시 primary)을 따르되,
 * 확장 영역에 인터랙티브 폼이 들어가므로 label 바깥의 형제 영역으로 분리한다.
 * (ChoicePanel은 전체가 FieldLabel이라 내부 폼 클릭이 라디오로 위임됨)
 */
function MethodCard({
  id,
  value,
  selected,
  title,
  description,
  badge,
  children,
}: MethodCardProps) {
  const hasBody = selected && !!children;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface transition-colors",
        selected && "border-primary",
      )}
    >
      <label
        htmlFor={id}
        className={cn(
          "flex w-full cursor-pointer items-start justify-between gap-4 rounded-xl px-4 py-4 transition-colors hover:bg-surface-muted",
          selected && "bg-primary/5 hover:bg-primary/5",
          hasBody && "rounded-b-none",
        )}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <FieldTitle>{title}</FieldTitle>
            {badge ? (
              <span className="text-xs font-semibold text-primary">
                {badge}
              </span>
            ) : null}
          </div>
          <FieldDescription className="mt-0">{description}</FieldDescription>
        </div>
        <RadioGroupItem id={id} value={value} className="mt-0.5 shrink-0" />
      </label>
      {hasBody ? (
        <div className="border-t border-border/70 px-4 pb-5 pt-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}

interface RepairShippingMethodChoiceProps {
  value: RepairShippingMethod;
  onChange: (value: RepairShippingMethod) => void;
  /** 수거비 등 가격 영향 표기 (예: "+3,000원") */
  pickupBadge?: ReactNode;
  directContent?: ReactNode;
  pickupContent?: ReactNode;
}

/** 수선품 발송 방법 선택: 직접 발송 vs 방문 수거 (결제 전 전용) */
export function RepairShippingMethodChoice({
  value,
  onChange,
  pickupBadge,
  directContent,
  pickupContent,
}: RepairShippingMethodChoiceProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as RepairShippingMethod)}
      className="gap-3"
    >
      <MethodCard
        id="repair-method-direct"
        value="direct"
        selected={value === "direct"}
        title="직접 택배로 보낼게요"
        description="편한 택배사로 아래 주소에 보내주세요."
      >
        {directContent}
      </MethodCard>
      <MethodCard
        id="repair-method-pickup"
        value="pickup"
        selected={value === "pickup"}
        title="방문 수거를 신청할게요"
        description="기사님이 방문해 수선품을 수거해요. 수거비는 결제 금액에 합산됩니다."
        badge={pickupBadge}
      >
        {pickupContent}
      </MethodCard>
    </RadioGroup>
  );
}
