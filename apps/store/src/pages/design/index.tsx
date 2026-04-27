"use client";

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import type { Attachment } from "@/features/design";
import { cn } from "@/shared/lib/utils";
import { useBreakpoint } from "@/shared/lib/breakpoint-provider";
import { ROUTES } from "@/shared/constants/ROUTES";
import { AUTH_REDIRECT_STORAGE_KEY } from "@/shared/lib/auth-redirect";
import { useAuthStore } from "@/shared/store/auth";
import { useModalStore } from "@/shared/store/modal";

const LOGIN_REQUIRED_MESSAGE =
  "로그인 후 이용 가능합니다. 로그인으로 이동하시겠습니까?";

function DesignPage() {
  const navigate = useNavigate();
  const { isDesktop } = useBreakpoint();
  const user = useAuthStore((state) => state.user);
  const confirm = useModalStore((state) => state.confirm);
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { isHistoryOpen, openHistory, closeHistory, restoreSession } =
    useSessionRestore();
  const { hasPendingResult, markPending, clearPending } =
    usePendingGeneration();
  const { sendMessage, regenerate } = useDesignChat({
    onGenerationStart: markPending,
    onGenerationEnd: clearPending,
  });
  const sendMessageWithAuthCheck = useCallback(
    (text: string, attachments: Attachment[]) => {
      if (user) {
        sendMessage(text, attachments);
        return;
      }

      confirm(
        LOGIN_REQUIRED_MESSAGE,
        () => {
          sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, ROUTES.DESIGN);
          navigate(ROUTES.LOGIN, { state: { from: ROUTES.DESIGN } });
        },
        { confirmText: "로그인", cancelText: "취소" },
      );
    },
    [confirm, navigate, sendMessage, user],
  );

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
              <PreviewPanel className="h-full" onRegenerate={regenerate} />
            </div>
          ) : null}
          <div
            className={cn(
              isDesktop ? "w-1/2 min-h-0" : "flex-1 min-h-0 w-full",
            )}
          >
            <ChatPanel
              className="h-full"
              sendMessage={sendMessageWithAuthCheck}
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
