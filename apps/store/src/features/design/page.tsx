"use client";

import { useEffect } from "react";

import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { ChatPanel } from "@/features/design/components/chat/chat-panel";
import { MobileHistorySheet } from "@/features/design/components/history/mobile-history-sheet";
import { OnboardingDialog } from "@/features/design/components/onboarding-dialog";
import { PreviewPanel } from "@/features/design/components/preview/preview-panel";
import { useDesignChat } from "@/features/design/hooks/use-design-chat";
import { useOnboarding } from "@/features/design/hooks/use-onboarding";
import { useSessionRestore } from "@/features/design/hooks/use-session-restore";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import { cn } from "@/shared/lib/utils";
import { useBreakpoint } from "@/shared/lib/breakpoint-provider";

function DesignPage() {
  const { isDesktop } = useBreakpoint();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { sendMessage } = useDesignChat();
  const generatedImageUrl = useDesignChatStore(
    (state) => state.generatedImageUrl,
  );
  const isImageDownloaded = useDesignChatStore(
    (state) => state.isImageDownloaded,
  );
  const { isHistoryOpen, openHistory, closeHistory, restoreSession } =
    useSessionRestore();

  const shouldBlock = generatedImageUrl !== null && !isImageDownloaded;

  useEffect(() => {
    if (!shouldBlock) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldBlock]);

  return (
    <MainLayout className="h-full">
      <MainContent className="min-h-0 overflow-hidden">
        <div
          className={cn(
            "mx-auto flex h-full w-full max-w-7xl min-h-0",
            isDesktop ? "flex-row" : "flex-col",
          )}
        >
          {isDesktop ? (
            <div className="w-1/2 overflow-hidden border-r">
              <PreviewPanel className="h-full" />
            </div>
          ) : null}
          <div
            className={cn(
              isDesktop ? "w-1/2 min-h-0" : "flex-1 min-h-0 w-full",
            )}
          >
            <ChatPanel
              className="h-full"
              sendMessage={sendMessage}
              onOpenHistory={openHistory}
            />
          </div>
        </div>
        {!isDesktop ? (
          <MobileHistorySheet
            open={isHistoryOpen}
            onClose={closeHistory}
            onSessionSelect={restoreSession}
          />
        ) : null}
        <OnboardingDialog open={showOnboarding} onClose={completeOnboarding} />
      </MainContent>
    </MainLayout>
  );
}

export default DesignPage;
