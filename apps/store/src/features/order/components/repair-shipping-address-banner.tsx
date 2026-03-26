import { Copy, MapPin } from "lucide-react";
import { Button } from "@/components/ui-extended/button";
import { Separator } from "@/components/ui/separator";
import { REPAIR_SHIPPING_ADDRESS } from "@/constants/REPAIR_SHIPPING";
import { toast } from "@/lib/toast";

interface RepairShippingAddressBannerProps {
  /** 제공 시 "송장번호 등록" 버튼 노출 */
  onRegisterTracking?: () => void;
}

export function RepairShippingAddressBanner({
  onRegisterTracking,
}: RepairShippingAddressBannerProps) {
  const handleCopyAddress = async () => {
    try {
      const text = `${REPAIR_SHIPPING_ADDRESS.recipient} / ${REPAIR_SHIPPING_ADDRESS.address} / ${REPAIR_SHIPPING_ADDRESS.phone}`;
      await navigator.clipboard.writeText(text);
      toast.success("주소가 복사되었습니다.");
    } catch {
      toast.error("주소 복사에 실패했습니다.");
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white p-2">
            <MapPin className="h-4 w-4 text-zinc-700" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-950">
              수선품 보내실 곳
            </h4>
            <p className="mt-0.5 text-xs text-zinc-500">
              택배 발송 시 아래 주소를 이용해 주세요.
            </p>
          </div>
        </div>
        {onRegisterTracking && (
          <Button
            size="sm"
            onClick={onRegisterTracking}
            className="h-8 shrink-0 text-xs font-semibold"
          >
            송장번호 등록하기
          </Button>
        )}
      </div>

      <div className="space-y-4 text-sm">
        <div className="flex justify-between items-center px-1">
          <span className="shrink-0 text-zinc-500">받는 사람</span>
          <span className="text-right font-medium text-zinc-950">
            {REPAIR_SHIPPING_ADDRESS.recipient}
          </span>
        </div>
        <Separator className="bg-stone-200" />
        <div className="flex justify-between items-start gap-8 px-1">
          <span className="shrink-0 text-zinc-500">주소</span>
          <span className="break-keep text-right font-medium leading-relaxed text-zinc-950">
            {REPAIR_SHIPPING_ADDRESS.address}
          </span>
        </div>
        <Separator className="bg-stone-200" />
        <div className="flex justify-between items-center px-1">
          <span className="shrink-0 text-zinc-500">연락처</span>
          <span className="text-right font-medium text-zinc-950">
            {REPAIR_SHIPPING_ADDRESS.phone}
          </span>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleCopyAddress}
        className="mt-6 flex h-9 w-full items-center gap-2 bg-white text-xs font-semibold text-zinc-600 transition-all hover:bg-white hover:text-zinc-950"
      >
        <Copy className="h-3.5 w-3.5" />
        주소 정보 전체 복사
      </Button>
    </div>
  );
}
