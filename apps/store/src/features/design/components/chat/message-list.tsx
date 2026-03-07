import { useEffect, useRef } from "react";

import { MessageBubble } from "@/features/design/components/chat/message-bubble";
import { TypingIndicator } from "@/features/design/components/chat/typing-indicator";
import type { Message } from "@/features/design/types/chat";

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  onChipClick?: (text: string) => void;
}

export function MessageList({ messages, isTyping, onChipClick }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} onChipClick={onChipClick} />
      ))}
      {isTyping ? <TypingIndicator /> : null}
      <div ref={bottomRef} />
    </div>
  );
}
