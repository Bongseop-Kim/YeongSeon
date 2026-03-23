import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

import { ChatHeader } from "@/features/design/components/chat/chat-header";
import { TiePreviewModal } from "@/features/design/components/chat/tie-preview-modal";
import { ChatInput } from "@/features/design/components/chat/chat-input";
import { MessageList } from "@/features/design/components/chat/message-list";
import {
  QUICK_CHIPS,
  WELCOME_MESSAGE,
} from "@/features/design/constants/welcome";
import { useDesignTokenBalanceQuery } from "@/features/design/api/ai-design-query";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import type { Attachment } from "@/features/design/types/chat";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  className?: string;
  sendMessage: (text: string, attachments: Attachment[]) => void;
  onOpenHistory: () => void;
}

export function ChatPanel({
  className,
  sendMessage,
  onOpenHistory,
}: ChatPanelProps) {
  const messages = useDesignChatStore((state) => state.messages);
  const { data: tokenBalance } = useDesignTokenBalanceQuery();
  const generationStatus = useDesignChatStore(
    (state) => state.generationStatus,
  );
  const resetConversation = useDesignChatStore(
    (state) => state.resetConversation,
  );
  const pendingAttachments = useDesignChatStore(
    (state) => state.pendingAttachments,
  );
  const aiModel = useDesignChatStore((state) => state.aiModel);
  const setAiModel = useDesignChatStore((state) => state.setAiModel);

  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedImageUrl) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedImageUrl]);

  const handleChipClick = (text: string) => {
    sendMessage(text, pendingAttachments);
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <ChatHeader
        onNewChat={resetConversation}
        onOpenHistory={onOpenHistory}
        tokenBalance={tokenBalance?.total}
        aiModel={aiModel}
        onModelChange={setAiModel}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {messages.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
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
        ) : (
          <MessageList
            messages={messages}
            isTyping={
              generationStatus === "generating" ||
              generationStatus === "regenerating"
            }
            onChipClick={handleChipClick}
            onTiePreviewClick={(url) => setSelectedImageUrl(url)}
          />
        )}
      </div>
      {selectedImageUrl ? (
        <TiePreviewModal
          imageUrl={selectedImageUrl}
          onClose={() => setSelectedImageUrl(null)}
        />
      ) : null}
      <div className="shrink-0 border-t p-2">
        <ChatInput
          onSend={sendMessage}
          isLoading={
            generationStatus === "generating" ||
            generationStatus === "regenerating"
          }
        />
      </div>
    </div>
  );
}
