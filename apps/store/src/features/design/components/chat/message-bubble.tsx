import { Badge } from "@/shared/ui/badge";
import type { Message } from "@/features/design/types/chat";
import { cn } from "@/shared/lib/utils";
import { useBreakpoint } from "@/shared/lib/breakpoint-provider";
import { toPreviewBackground } from "@/shared/lib/to-preview-background";
import { escapeCssUrl } from "@/shared/lib/css-url";

interface MessageBubbleProps {
  message: Message;
  onChipClick?: (text: string) => void;
  onTiePreviewClick?: (preview: TilePreviewSelection) => void;
  selectedPreviewImageUrl?: string | null;
  onSelectPreview?: (preview: TilePreviewSelection) => void;
}

export interface TilePreviewSelection {
  previewBackground: string;
  repeatTile: {
    url: string;
    workId: string | null;
  };
  accentTile: {
    url: string;
    workId: string | null;
  } | null;
}

function ChatTilePreview({
  repeatTileUrl,
  accentTileUrl,
}: {
  repeatTileUrl: string;
  accentTileUrl?: string;
}) {
  const tileUrls = accentTileUrl
    ? [repeatTileUrl, accentTileUrl]
    : [repeatTileUrl];

  return (
    <div className="flex gap-2">
      {tileUrls.map((url, index) => (
        <div
          key={`${url}-${index}`}
          aria-label={index === 0 ? "반복 타일 이미지" : "강조 타일 이미지"}
          className="aspect-square w-20 rounded-md border border-gray-200 bg-cover bg-center bg-no-repeat shadow-sm"
          style={{ backgroundImage: `url("${escapeCssUrl(url)}")` }}
        />
      ))}
    </div>
  );
}

export function MessageBubble({
  message,
  onChipClick,
  onTiePreviewClick,
  selectedPreviewImageUrl,
  onSelectPreview,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const { isMobile } = useBreakpoint();
  const repeatTileUrl = message.imageUrl;
  const previewBackground = repeatTileUrl
    ? toPreviewBackground(repeatTileUrl)
    : undefined;
  const tilePreview =
    repeatTileUrl && previewBackground
      ? {
          previewBackground,
          repeatTile: {
            url: repeatTileUrl,
            workId: message.workId ?? null,
          },
          accentTile: message.accentTileUrl
            ? {
                url: message.accentTileUrl,
                workId: message.accentTileWorkId ?? null,
              }
            : null,
        }
      : null;
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
      {!isUser && repeatTileUrl && previewBackground && tilePreview ? (
        <div className="space-y-2">
          {isMobile ? (
            onTiePreviewClick ? (
              <button
                type="button"
                aria-label="타일 프리뷰 확대"
                className="cursor-pointer"
                onClick={() => onTiePreviewClick(tilePreview)}
              >
                <ChatTilePreview
                  repeatTileUrl={repeatTileUrl}
                  accentTileUrl={message.accentTileUrl}
                />
              </button>
            ) : (
              <ChatTilePreview
                repeatTileUrl={repeatTileUrl}
                accentTileUrl={message.accentTileUrl}
              />
            )
          ) : (
            <div className="relative">
              <button
                type="button"
                aria-label="타일 프리뷰 선택"
                aria-pressed={selectedPreviewImageUrl === previewBackground}
                className={cn(
                  "cursor-pointer transition-all",
                  selectedPreviewImageUrl === previewBackground
                    ? "opacity-100"
                    : "opacity-40 grayscale hover:opacity-70",
                )}
                onClick={() => onSelectPreview?.(tilePreview)}
              >
                <ChatTilePreview
                  repeatTileUrl={repeatTileUrl}
                  accentTileUrl={message.accentTileUrl}
                />
              </button>
              {selectedPreviewImageUrl === previewBackground && (
                <div
                  aria-label="선택됨"
                  className="pointer-events-none absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-indigo-600"
                >
                  <span className="text-[10px] leading-none text-white">✓</span>
                </div>
              )}
            </div>
          )}
        </div>
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
