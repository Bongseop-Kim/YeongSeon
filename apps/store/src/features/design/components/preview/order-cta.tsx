import { Button } from "@/components/ui/button";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";

export function OrderCta() {
  const generationStatus = useDesignChatStore((state) => state.generationStatus);

  const hidden = generationStatus === "idle" || generationStatus === "generating";

  return (
    <Button
      type="button"
      className={hidden ? "invisible w-full" : "w-full"}
      size="lg"
      onClick={() => {
        console.log("주문 제작하기 클릭 - TODO: 주문 플로우 연동");
      }}
    >
      주문 제작하기
    </Button>
  );
}
