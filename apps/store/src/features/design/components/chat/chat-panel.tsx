import { useState } from "react";

import {
  isActiveGeneration,
  useDesignTokenBalanceQuery,
} from "@/entities/design";
import { ChatInput } from "@/features/design/components/chat/chat-input";
import { DesignGenerationFeed } from "@/features/design/components/feed/design-generation-feed";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import type { Attachment } from "@/features/design/types/chat";
import { cn } from "@/shared/lib/utils";

interface ChatPanelProps {
  className?: string;
  sendMessage: (text: string, attachments: Attachment[]) => void;
  onCharge?: () => void;
  onOpenHistory?: () => void;
}

export function ChatPanel({
  className,
  sendMessage,
  onCharge,
}: ChatPanelProps) {
  const { data: tokenBalance } = useDesignTokenBalanceQuery();
  const generationStatus = useDesignChatStore(
    (state) => state.generationStatus,
  );

  const isGenerating = isActiveGeneration(generationStatus);
  const [draftText, setDraftText] = useState<string | undefined>(undefined);
  const [draftRevision, setDraftRevision] = useState(0);
  const handleReusePrompt = (prompt: string) => {
    setDraftText(prompt);
    setDraftRevision((value) => value + 1);
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-white", className)}>
      <div className="relative z-20 shrink-0 px-3 py-4 max-lg:order-2 max-lg:border-t max-lg:bg-white max-lg:pb-[calc(env(safe-area-inset-bottom)+1rem)] max-lg:pt-3">
        <ChatInput
          onSend={sendMessage}
          isLoading={isGenerating}
          draftText={draftText}
          draftRevision={draftRevision}
          tokenBalance={tokenBalance?.total}
          onCharge={onCharge}
        />
      </div>
      <DesignGenerationFeed
        className="flex-1 max-lg:order-1"
        onReusePrompt={handleReusePrompt}
      />
    </div>
  );
}
