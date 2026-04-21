import { useEffect, useRef } from "react";

import { MessageBubble } from "@/features/design/components/chat/message-bubble";
import { TypingIndicator } from "@/features/design/components/chat/typing-indicator";
import type { Message } from "@/features/design/types/chat";

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  onChipClick?: (text: string) => void;
  onTiePreviewClick?: (imageUrl: string) => void;
  selectedPreviewImageUrl?: string | null;
  onSelectPreview?: (imageUrl: string) => void;
  onRequestInpaint?: (imageUrl: string, imageWorkId: string | null) => void;
}

export function MessageList({
  messages,
  isTyping,
  onChipClick,
  onTiePreviewClick,
  selectedPreviewImageUrl,
  onSelectPreview,
  onRequestInpaint,
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
          onChipClick={onChipClick}
          onTiePreviewClick={onTiePreviewClick}
          selectedPreviewImageUrl={selectedPreviewImageUrl}
          onSelectPreview={onSelectPreview}
          onRequestInpaint={onRequestInpaint}
        />
      ))}
      {isTyping ? <TypingIndicator /> : null}
      <div ref={bottomRef} />
    </div>
  );
}
