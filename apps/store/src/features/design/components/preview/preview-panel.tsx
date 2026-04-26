import { useEffect, useRef, useState } from "react";

import { OrderCta } from "@/features/design/components/preview/order-cta";
import { PreviewHeader } from "@/features/design/components/preview/preview-header";
import { ResultTagBar } from "@/features/design/components/preview/result-tag-bar";
import { TieCanvas } from "@/features/design/components/preview/tie-canvas";
import { HistoryTab } from "@/features/design/components/history/history-tab";
import { useSessionRestore } from "@/features/design/hooks/use-session-restore";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import type { DesignSession } from "@/features/design/types/session";
import { cn } from "@/shared/lib/utils";

type PreviewTab = "preview" | "history";

interface PreviewPanelProps {
  className?: string;
  onRegenerate: () => void;
}

export function PreviewPanel({ className, onRegenerate }: PreviewPanelProps) {
  const [tab, setTab] = useState<PreviewTab>("preview");
  const [unmasked, setUnmasked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isLegacySession = useDesignChatStore(
    (state) => state.generatedImageUrl !== null && state.repeatTile === null,
  );
  const resetConversation = useDesignChatStore(
    (state) => state.resetConversation,
  );
  const sectionRef = useRef<HTMLElement>(null);
  const { restoreSession } = useSessionRestore({
    onRestored: () => setTab("preview"),
  });

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(document.fullscreenElement === sectionRef.current);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      sectionRef.current?.requestFullscreen();
    }
  };

  const handleSessionSelect = (session: DesignSession) => {
    restoreSession(session);
  };

  return (
    <section
      ref={sectionRef}
      className={cn("relative flex h-full flex-col bg-white", className)}
    >
      {!isFullscreen && (
        <div className="flex min-h-16 border-b border-gray-200">
          {(["preview", "history"] as PreviewTab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={cn(
                "flex-1 text-sm transition-colors",
                tab === t
                  ? "border-b-2 border-gray-900 font-semibold text-gray-900"
                  : "text-gray-400 hover:text-gray-600",
              )}
              onClick={() => setTab(t)}
            >
              {t === "preview" ? "미리보기" : "기록"}
            </button>
          ))}
        </div>
      )}

      {tab === "preview" ? (
        <div className="flex flex-1 flex-col p-4">
          {!isFullscreen && (
            <PreviewHeader
              unmasked={unmasked}
              onToggle={() => setUnmasked((v) => !v)}
            />
          )}
          {!isFullscreen && isLegacySession && (
            <div className="mt-3 flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <span>
                이전 방식으로 생성된 디자인입니다. 수정하려면 새 세션을
                시작하세요.
              </span>
              <button
                type="button"
                className="shrink-0 underline"
                onClick={resetConversation}
              >
                새 세션 시작
              </button>
            </div>
          )}
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            <TieCanvas unmasked={unmasked} />
          </div>
          {!isFullscreen && (
            <div className="flex flex-col gap-4">
              <ResultTagBar
                isFullscreen={false}
                onToggleFullscreen={handleToggleFullscreen}
                unmasked={unmasked}
                onRegenerate={onRegenerate}
              />
              <OrderCta />
            </div>
          )}
          {isFullscreen && (
            <div className="absolute bottom-4 right-4">
              <ResultTagBar
                isFullscreen={true}
                onToggleFullscreen={handleToggleFullscreen}
                unmasked={unmasked}
                onRegenerate={onRegenerate}
              />
            </div>
          )}
        </div>
      ) : (
        <HistoryTab onSessionSelect={handleSessionSelect} />
      )}
    </section>
  );
}
