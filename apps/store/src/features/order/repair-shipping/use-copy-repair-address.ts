import { REPAIR_SHIPPING_ADDRESS } from "@/shared/constants/REPAIR_SHIPPING";
import { toast } from "@/shared/lib/toast";

/** 수선품 발송 주소를 클립보드에 복사한다. */
export function useCopyRepairAddress() {
  const copyAddress = async () => {
    try {
      const text = `${REPAIR_SHIPPING_ADDRESS.recipient} / ${REPAIR_SHIPPING_ADDRESS.address} / ${REPAIR_SHIPPING_ADDRESS.phone}`;
      await navigator.clipboard.writeText(text);
      toast.success("주소를 복사했습니다.");
    } catch {
      toast.error("주소를 복사하지 못했어요. 다시 시도해주세요.");
    }
  };

  return { copyAddress };
}
