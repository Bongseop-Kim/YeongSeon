import { useNavigate } from "react-router-dom";

import { Button } from "@/shared/ui-extended/button";
import { ROUTES } from "@/shared/constants/ROUTES";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";

export function OrderCta() {
  const navigate = useNavigate();
  const generationStatus = useDesignChatStore(
    (state) => state.generationStatus,
  );

  const hidden =
    generationStatus === "idle" ||
    generationStatus === "generating" ||
    generationStatus === "regenerating" ||
    generationStatus === "rendering";

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
