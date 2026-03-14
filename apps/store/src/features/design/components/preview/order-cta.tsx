import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/ROUTES";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import { useModalStore } from "@/store/modal";

export function OrderCta() {
  const navigate = useNavigate();
  const generationStatus = useDesignChatStore(
    (state) => state.generationStatus,
  );
  const isImageDownloaded = useDesignChatStore(
    (state) => state.isImageDownloaded,
  );
  const openModal = useModalStore((state) => state.openModal);

  const hidden =
    generationStatus === "idle" ||
    generationStatus === "generating" ||
    generationStatus === "regenerating";

  const handleClick = () => {
    if (!isImageDownloaded) {
      openModal({
        title: "이미지를 저장하지 않았어요",
        description:
          "생성된 넥타이 디자인 이미지를 아직 다운로드하지 않았습니다. 페이지를 벗어나면 이미지를 다시 받을 수 없어요.",
        confirmText: "그냥 이동",
        cancelText: "돌아가서 저장",
        onConfirm: () => navigate(ROUTES.CUSTOM_ORDER),
      });
      return;
    }
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
