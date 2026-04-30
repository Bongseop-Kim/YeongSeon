import { useState } from "react";

import {
  isActiveGeneration,
  useDesignTokenBalanceQuery,
} from "@/entities/design";
import { ChatHeader } from "@/features/design/components/chat/chat-header";
import { ChatInput } from "@/features/design/components/chat/chat-input";
import { DesignGenerationFeed } from "@/features/design/components/feed/design-generation-feed";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import type { Attachment } from "@/features/design/types/chat";
import { cn } from "@/shared/lib/utils";

interface ChatPanelProps {
  className?: string;
  sendMessage: (text: string, attachments: Attachment[]) => void;
  onOpenHistory?: () => void;
}

export function ChatPanel({ className, sendMessage }: ChatPanelProps) {
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
      <ChatHeader tokenBalance={tokenBalance?.total} />
      <div className="relative z-20 shrink-0 px-3 py-4">
        <ChatInput
          onSend={sendMessage}
          isLoading={isGenerating}
          draftText={draftText}
          draftRevision={draftRevision}
        />
      </div>
      <DesignGenerationFeed
        className="flex-1"
        onReusePrompt={handleReusePrompt}
      />
    </div>
  );
}
