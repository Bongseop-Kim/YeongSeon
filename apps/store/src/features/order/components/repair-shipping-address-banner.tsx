import { Copy, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              수선품 보내실 곳
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              택배 발송 시 아래 주소를 이용해 주세요.
            </p>
          </div>
        </div>
        {onRegisterTracking && (
          <Button
            size="sm"
            onClick={onRegisterTracking}
            className="h-8 text-xs shrink-0 font-semibold"
          >
            송장번호 등록하기
          </Button>
        )}
      </div>

      <div className="space-y-4 text-sm">
        <div className="flex justify-between items-center px-1">
          <span className="text-muted-foreground shrink-0">받는 사람</span>
          <span className="font-medium text-right text-foreground">
            {REPAIR_SHIPPING_ADDRESS.recipient}
          </span>
        </div>
        <Separator className="bg-border/50" />
        <div className="flex justify-between items-start gap-8 px-1">
          <span className="text-muted-foreground shrink-0">주소</span>
          <span className="font-medium text-right leading-relaxed break-keep text-foreground">
            {REPAIR_SHIPPING_ADDRESS.address}
          </span>
        </div>
        <Separator className="bg-border/50" />
        <div className="flex justify-between items-center px-1">
          <span className="text-muted-foreground shrink-0">연락처</span>
          <span className="font-medium text-right text-foreground">
            {REPAIR_SHIPPING_ADDRESS.phone}
          </span>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleCopyAddress}
        className="w-full mt-6 h-9 text-xs font-semibold flex items-center gap-2 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
      >
        <Copy className="w-3.5 h-3.5" />
        주소 정보 전체 복사
      </Button>
    </div>
  );
}
