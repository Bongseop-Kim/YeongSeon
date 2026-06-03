import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { openKakaoChannelChat } from "@/shared/lib/kakao-channel";
import { cn } from "@/shared/lib/utils";

interface KakaoChannelFloatingButtonProps {
  avoidMobileActionBar?: boolean;
}

export function KakaoChannelFloatingButton({
  avoidMobileActionBar = false,
}: KakaoChannelFloatingButtonProps) {
  const [isOpening, setIsOpening] = useState(false);

  const handleChatClick = async () => {
    setIsOpening(true);

    try {
      await openKakaoChannelChat();
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <button
      type="button"
      className={cn(
        "fixed right-4 z-50 inline-flex size-11 items-center justify-center rounded-full bg-brand-kakao text-brand-ink shadow-lg shadow-black/18 transition hover:bg-brand-kakao-hover focus-visible:ring-2 focus-visible:ring-brand-kakao focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-70 sm:right-6 sm:bottom-6 sm:size-12",
        avoidMobileActionBar
          ? "bottom-[calc(env(safe-area-inset-bottom,0px)+5.75rem)]"
          : "bottom-5",
      )}
      onClick={handleChatClick}
      disabled={isOpening}
      aria-label="카카오톡 채널 채팅하기"
    >
      <MessageCircle className="size-5 sm:size-5.5" aria-hidden="true" />
    </button>
  );
}
