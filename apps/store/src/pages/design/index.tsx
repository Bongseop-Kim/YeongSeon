"use client";

import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageSeo } from "@/shared/ui/page-seo";
import {
  ChatPanel,
  MobileHistorySheet,
  OnboardingDialog,
  PendingResultBanner,
  PreviewPanel,
  useDesignChat,
  useOnboarding,
  usePendingGeneration,
  useSessionRestore,
} from "@/features/design";
import { cn } from "@/shared/lib/utils";
import { useBreakpoint } from "@/shared/lib/breakpoint-provider";

function DesignPage() {
  const { isDesktop } = useBreakpoint();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { isHistoryOpen, openHistory, closeHistory, restoreSession } =
    useSessionRestore();
  const { hasPendingResult, markPending, clearPending } =
    usePendingGeneration();
  const { sendMessage, requestRender } = useDesignChat({
    onGenerationStart: markPending,
    onGenerationEnd: clearPending,
  });

  return (
    <MainLayout className="h-full">
      <PageSeo
        title="AI 넥타이 디자인"
        description="AI와 대화하며 나만의 넥타이를 디자인해보세요. 원하는 색상, 패턴, 소재를 자유롭게 요청하면 ESSE SION이 맞춤 제작합니다."
        ogUrl="https://essesion.shop/design"
      />
      <MainContent className="min-h-0 overflow-hidden">
        {hasPendingResult && (
          <PendingResultBanner
            onConfirm={() => {
              openHistory();
              clearPending();
            }}
            onDismiss={clearPending}
          />
        )}
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
              onRequestRender={requestRender}
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
