"use client";

import { useEffect } from "react";

import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { ChatPanel } from "@/features/design/components/chat/chat-panel";
import { OnboardingDialog } from "@/features/design/components/onboarding-dialog";
import { PreviewPanel } from "@/features/design/components/preview/preview-panel";
import { useDesignChat } from "@/features/design/hooks/use-design-chat";
import { useOnboarding } from "@/features/design/hooks/use-onboarding";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import { cn } from "@/lib/utils";
import { useBreakpoint } from "@/providers/breakpoint-provider";

export function DesignPage() {
  const { isDesktop } = useBreakpoint();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { sendMessage } = useDesignChat();
  const generatedImageUrl = useDesignChatStore(
    (state) => state.generatedImageUrl,
  );
  const isImageDownloaded = useDesignChatStore(
    (state) => state.isImageDownloaded,
  );

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
    <MainLayout>
      <MainContent className="overflow-hidden">
        <div
          className={cn(
            "flex h-[calc(100vh-4rem)]",
            isDesktop ? "flex-row" : "flex-col",
          )}
        >
          {isDesktop ? (
            <div className="w-1/2 overflow-hidden border-r">
              <PreviewPanel className="h-full" />
            </div>
          ) : null}
          <div className={cn(isDesktop ? "w-1/2" : "flex-1 w-full")}>
            <ChatPanel className="h-full" sendMessage={sendMessage} />
          </div>
        </div>
        <OnboardingDialog open={showOnboarding} onClose={completeOnboarding} />
      </MainContent>
    </MainLayout>
  );
}

export default DesignPage;
