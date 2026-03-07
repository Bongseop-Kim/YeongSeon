import { useState } from "react";
import { Sparkles } from "lucide-react";

import { ChatHeader } from "@/features/design/components/chat/chat-header";
import { ChatInput } from "@/features/design/components/chat/chat-input";
import { HistoryPanel } from "@/features/design/components/chat/history-panel";
import { MessageList } from "@/features/design/components/chat/message-list";
import { QUICK_CHIPS, WELCOME_MESSAGE } from "@/features/design/constants/welcome";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import type { Attachment, Conversation } from "@/features/design/types/chat";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  className?: string;
  sendMessage: (text: string, attachments: Attachment[]) => void;
  conversations: Conversation[];
}

export function ChatPanel({
  className,
  sendMessage,
  conversations,
}: ChatPanelProps) {
  const [showHistory, setShowHistory] = useState(false);
  const messages = useDesignChatStore((state) => state.messages);
  const tokenCount = messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 2), 0);
  const generationStatus = useDesignChatStore((state) => state.generationStatus);
  const resetConversation = useDesignChatStore((state) => state.resetConversation);
  const loadConversation = useDesignChatStore((state) => state.loadConversation);

  const handleNewChat = () => {
    resetConversation();
  };

  const handleChipClick = (text: string) => {
    sendMessage(text, []);
  };

  const handleLoadConversation = (conversation: Conversation) => {
    loadConversation(conversation);
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <ChatHeader
        onHistoryClick={() => setShowHistory(true)}
        onNewChat={handleNewChat}
        tokenCount={tokenCount}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <div className="flex items-start gap-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-900">
                <Sparkles className="size-3.5 text-white" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3 text-sm text-gray-900 whitespace-pre-line">
                  {WELCOME_MESSAGE}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip.action}
                      type="button"
                      onClick={() => handleChipClick(chip.action)}
                      className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 transition-colors hover:border-gray-500 hover:text-gray-900"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <MessageList
          messages={messages}
          isTyping={generationStatus === "generating"}
          onChipClick={handleChipClick}
        />
      </div>
      <div className="border-t p-2">
        <ChatInput onSend={sendMessage} isLoading={generationStatus === "generating" || generationStatus === "regenerating"} />
      </div>
      <HistoryPanel
        open={showHistory}
        conversations={conversations}
        onSelect={handleLoadConversation}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
}
