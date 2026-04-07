"use client";

import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import {
  ChatPanel,
  MobileHistorySheet,
  OnboardingDialog,
  PreviewPanel,
  useDesignChat,
  useOnboarding,
  useSessionRestore,
} from "@/features/design";
import { cn } from "@/shared/lib/utils";
import { useBreakpoint } from "@/shared/lib/breakpoint-provider";

function DesignPage() {
  const { isDesktop } = useBreakpoint();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { sendMessage } = useDesignChat();
  const { isHistoryOpen, openHistory, closeHistory, restoreSession } =
    useSessionRestore();

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
