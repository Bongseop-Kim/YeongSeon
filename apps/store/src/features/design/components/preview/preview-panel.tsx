import { useEffect, useRef, useState } from "react";

import { OrderCta } from "@/features/design/components/preview/order-cta";
import { PreviewHeader } from "@/features/design/components/preview/preview-header";
import { ResultTagBar } from "@/features/design/components/preview/result-tag-bar";
import { TieCanvas } from "@/features/design/components/preview/tie-canvas";
import { HistoryTab } from "@/features/design/components/history/history-tab";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import { useDesignSessionMessagesQuery } from "@/features/design/api/design-session-query";
import { sessionMessageToMessage } from "@/features/design/api/design-session-mapper";
import type { DesignSession } from "@/features/design/types/session";
import { cn } from "@/lib/utils";
import { toPreviewBackground } from "@/features/design/utils";

type PreviewTab = "preview" | "history";

interface PreviewPanelProps {
  className?: string;
}

export function PreviewPanel({ className }: PreviewPanelProps) {
  const [tab, setTab] = useState<PreviewTab>("preview");
  const [unmasked, setUnmasked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [restoringSessionId, setRestoringSessionId] = useState<string | null>(
    null,
  );
  const sectionRef = useRef<HTMLElement>(null);

  const restoreMessages = useDesignChatStore((state) => state.restoreMessages);
  const setGeneratedImage = useDesignChatStore(
    (state) => state.setGeneratedImage,
  );
  const setCurrentSessionId = useDesignChatStore(
    (state) => state.setCurrentSessionId,
  );

  const { data: sessionMessages } = useDesignSessionMessagesQuery(
    restoringSessionId ?? "",
  );

  useEffect(() => {
    if (!restoringSessionId || !sessionMessages) return;

    restoreMessages(sessionMessages.map(sessionMessageToMessage));
    setCurrentSessionId(restoringSessionId);

    const lastImage = [...sessionMessages]
      .reverse()
      .find((m) => m.imageUrl != null);
    if (lastImage?.imageUrl) {
      setGeneratedImage(toPreviewBackground(lastImage.imageUrl), []);
    }

    setRestoringSessionId(null);
    setTab("preview");
  }, [
    restoringSessionId,
    sessionMessages,
    restoreMessages,
    setCurrentSessionId,
    setGeneratedImage,
  ]);

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
    setRestoringSessionId(session.id);
  };

  return (
    <section
      ref={sectionRef}
      className={cn("relative flex h-full flex-col bg-white", className)}
    >
      {!isFullscreen && (
        <div className="flex border-b border-gray-200">
          {(["preview", "history"] as PreviewTab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={cn(
                "flex-1 py-2.5 text-sm transition-colors",
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
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            <TieCanvas unmasked={unmasked} />
          </div>
          {!isFullscreen && (
            <div className="flex flex-col gap-4">
              <ResultTagBar
                isFullscreen={false}
                onToggleFullscreen={handleToggleFullscreen}
                unmasked={unmasked}
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
