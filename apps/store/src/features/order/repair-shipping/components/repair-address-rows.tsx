import { Copy } from "lucide-react";
import { Button } from "@/shared/ui-extended/button";
import { Separator } from "@/shared/ui/separator";
import { REPAIR_SHIPPING_ADDRESS } from "@/shared/constants/REPAIR_SHIPPING";
import { cn } from "@/shared/lib/utils";
import { useCopyRepairAddress } from "@/features/order/repair-shipping/use-copy-repair-address";

interface RepairAddressRowsProps {
  className?: string;
}

/**
 * 수선품 발송 주소를 플랫 정의 리스트로 보여준다.
 * 프레임(박스/배경)은 갖지 않으며, 배치 맥락은 사용처가 소유한다.
 */
export function RepairAddressRows({ className }: RepairAddressRowsProps) {
  return (
    <dl className={cn("space-y-4 text-sm", className)}>
      <div className="flex items-center justify-between gap-8">
        <dt className="shrink-0 text-zinc-500">받는 사람</dt>
        <dd className="text-right font-medium text-zinc-950">
          {REPAIR_SHIPPING_ADDRESS.recipient}
        </dd>
      </div>
      <Separator className="bg-stone-200" />
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <dt className="shrink-0 text-zinc-500">주소</dt>
        <dd className="break-keep font-medium leading-relaxed text-zinc-950 sm:text-right">
          {REPAIR_SHIPPING_ADDRESS.address}
        </dd>
      </div>
      <Separator className="bg-stone-200" />
      <div className="flex items-center justify-between gap-8">
        <dt className="shrink-0 text-zinc-500">연락처</dt>
        <dd>
          <a
            href={`tel:${REPAIR_SHIPPING_ADDRESS.phone}`}
            className="font-medium text-zinc-950 underline-offset-4 hover:underline"
          >
            {REPAIR_SHIPPING_ADDRESS.phone}
          </a>
        </dd>
      </div>
    </dl>
  );
}

interface RepairAddressCopyButtonProps {
  className?: string;
}

/** 발송 주소 복사 액션 — 섹션/카드 헤더 우측에 배치한다. */
export function RepairAddressCopyButton({
  className,
}: RepairAddressCopyButtonProps) {
  const { copyAddress } = useCopyRepairAddress();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={copyAddress}
      className={className}
    >
      <Copy className="size-3.5" />
      주소 복사
    </Button>
  );
}
