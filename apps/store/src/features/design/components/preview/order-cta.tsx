import { useNavigate } from "react-router-dom";

import { Button } from "@/shared/ui-extended/button";
import { ROUTES } from "@/shared/constants/ROUTES";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";

export function OrderCta() {
  const navigate = useNavigate();
  const generationStatus = useDesignChatStore(
    (state) => state.generationStatus,
  );
  const selectedPreviewImageUrl = useDesignChatStore(
    (state) => state.selectedPreviewImageUrl,
  );

  const hidden =
    !selectedPreviewImageUrl ||
    generationStatus === "generating" ||
    generationStatus === "regenerating";

  const handleClick = () => {
    navigate(ROUTES.CUSTOM_ORDER);
  };

  return (
    <Button
      type="button"
      className={hidden ? "invisible w-full" : "w-full"}
      size="lg"
      onClick={handleClick}
    >
      주문 제작하기
    </Button>
  );
}
