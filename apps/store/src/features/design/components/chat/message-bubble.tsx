import type { CSSProperties } from "react";

import { Badge } from "@/components/ui/badge";
import type { Message } from "@/features/design/types/chat";
import { cn } from "@/lib/utils";
import { useBreakpoint } from "@/providers/breakpoint-provider";

const tiePreviewStyle: CSSProperties = {
  maskImage: "url(/images/tie.svg)",
  maskSize: "contain",
  maskPosition: "center",
  maskRepeat: "no-repeat",
  WebkitMaskImage: "url(/images/tie.svg)",
  WebkitMaskSize: "contain",
  WebkitMaskPosition: "center",
  WebkitMaskRepeat: "no-repeat",
};

interface MessageBubbleProps {
  message: Message;
  onChipClick?: (text: string) => void;
  onImageIndicatorClick?: (imageUrl: string) => void;
}

export function MessageBubble({
  message,
  onChipClick,
  onImageIndicatorClick,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const { isMobile } = useBreakpoint();
  const timestamp = new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(message.timestamp));

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isUser ? "items-end" : "items-start",
      )}
    >
      {isUser && message.attachments && message.attachments.length > 0 ? (
        <div className="flex max-w-[85%] flex-wrap justify-end gap-1">
          {message.attachments.map((attachment, index) => (
            <Badge
              key={`${attachment.type}-${attachment.value}-${index}`}
              variant="outline"
              className="bg-white"
            >
              {attachment.label}
            </Badge>
          ))}
        </div>
      ) : null}
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap break-words px-4 py-3 text-sm",
          isUser
            ? "rounded-2xl rounded-tr-sm bg-blue-500 text-white"
            : "rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900",
        )}
      >
        {message.content}
      </div>
      {!isUser && message.imageUrl && isMobile ? (
        <div className="relative h-[244px] w-[128px] overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              ...tiePreviewStyle,
              background: message.imageUrl,
            }}
          />
          <img
            src="/images/tieShadow.png"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          />
        </div>
      ) : null}
      {!isUser && message.imageUrl && !isMobile ? (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700 transition-colors hover:bg-green-100"
          onClick={() => onImageIndicatorClick?.(message.imageUrl ?? "")}
        >
          <span>🖼</span>
          <span>이미지 생성됨 · 우측 프리뷰 확인</span>
        </button>
      ) : null}
      {!isUser && message.contextChips && message.contextChips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {message.contextChips.map((chip) => (
            <button
              key={chip.action}
              type="button"
              onClick={() => onChipClick?.(chip.action)}
              className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 transition-colors hover:border-gray-500 hover:text-gray-900"
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}
      <span className="px-1 text-xs text-gray-400">{timestamp}</span>
    </div>
  );
}
