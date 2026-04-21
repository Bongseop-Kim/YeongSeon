import { useEffect, useRef } from "react";

import {
  MessageBubble,
  type AnalysisState,
} from "@/features/design/components/chat/message-bubble";
import { TypingIndicator } from "@/features/design/components/chat/typing-indicator";
import type { Message } from "@/features/design/types/chat";

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  analysisState?: AnalysisState | null;
  onChipClick?: (text: string) => void;
  onTiePreviewClick?: (imageUrl: string) => void;
  selectedPreviewImageUrl?: string | null;
  onSelectPreview?: (imageUrl: string) => void;
  onRequestInpaint?: (imageUrl: string, imageWorkId: string | null) => void;
  onRequestRender?: () => void;
  onOpenOptions?: () => void;
  onFocusInput?: () => void;
}

export function MessageList({
  messages,
  isTyping,
  analysisState,
  onChipClick,
  onTiePreviewClick,
  selectedPreviewImageUrl,
  onSelectPreview,
  onRequestInpaint,
  onRequestRender,
  onOpenOptions,
  onFocusInput,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          analysisState={analysisState}
          onChipClick={onChipClick}
          onTiePreviewClick={onTiePreviewClick}
          selectedPreviewImageUrl={selectedPreviewImageUrl}
          onSelectPreview={onSelectPreview}
          onRequestInpaint={onRequestInpaint}
          onRequestRender={onRequestRender}
          onOpenOptions={onOpenOptions}
          onFocusInput={onFocusInput}
        />
      ))}
      {isTyping ? <TypingIndicator /> : null}
      <div ref={bottomRef} />
    </div>
  );
}
