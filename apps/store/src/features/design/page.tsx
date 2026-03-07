"use client";

import { useEffect, useRef } from "react";

import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { ChatPanel } from "@/features/design/components/chat/chat-panel";
import { OnboardingDialog } from "@/features/design/components/onboarding-dialog";
import { PreviewPanel } from "@/features/design/components/preview/preview-panel";
import { useDesignChat } from "@/features/design/hooks/use-design-chat";
import { useDesignHistory } from "@/features/design/hooks/use-design-history";
import { useOnboarding } from "@/features/design/hooks/use-onboarding";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import type { Conversation } from "@/features/design/types/chat";
import { cn } from "@/lib/utils";
import { useBreakpoint } from "@/providers/breakpoint-provider";

const DEFAULT_CONVERSATION_TITLE = "새 디자인 대화";

const getConversationTitle = (messages: Conversation["messages"]): string => {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const titleSource = firstUserMessage?.content.trim();

  if (!titleSource) {
    return DEFAULT_CONVERSATION_TITLE;
  }

  return titleSource.length > 30
    ? `${titleSource.slice(0, 30)}...`
    : titleSource;
};

export function DesignPage() {
  const { isDesktop } = useBreakpoint();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { sendMessage } = useDesignChat();
  const { conversations, saveConversation } = useDesignHistory();
  const messages = useDesignChatStore((state) => state.messages);
  const conversationId = useDesignChatStore((state) => state.conversationId);
  const generatedImageUrl = useDesignChatStore(
    (state) => state.generatedImageUrl,
  );
  const saveConversationRef = useRef(saveConversation);

  useEffect(() => {
    saveConversationRef.current = saveConversation;
  }, [saveConversation]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];

    if (!lastMessage) {
      return;
    }

    saveConversationRef.current({
      id: conversationId,
      title: getConversationTitle(messages),
      lastMessage: lastMessage.content,
      thumbnailUrl: generatedImageUrl ?? undefined,
      updatedAt: Date.now(),
      messages,
    });
  }, [conversationId, generatedImageUrl, messages]);

  return (
    <MainLayout>
      <MainContent className="overflow-hidden">
        <div
          className={cn("flex h-[calc(100vh-4rem)]", isDesktop ? "flex-row" : "flex-col")}
        >
          {isDesktop ? (
            <div className="w-1/2 overflow-hidden border-r">
              <PreviewPanel className="h-full" />
            </div>
          ) : null}
          <div className={cn(isDesktop ? "w-1/2" : "flex-1 w-full")}>
            <ChatPanel
              className="h-full"
              sendMessage={sendMessage}
              conversations={conversations}
            />
          </div>
        </div>
        <OnboardingDialog open={showOnboarding} onClose={completeOnboarding} />
      </MainContent>
    </MainLayout>
  );
}

export default DesignPage;
