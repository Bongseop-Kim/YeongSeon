import { useEffect, useRef, useState } from "react";

import { useDesignSessionMessagesQuery } from "@/features/design/hooks/design-session-query";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import type { DesignSession } from "@/features/design/types/session";
import { fabricTypeToFabricMethod } from "@/entities/design";

interface UseSessionRestoreOptions {
  onRestored?: () => void;
}

interface SessionRestoreState {
  isHistoryOpen: boolean;
  openHistory: () => void;
  closeHistory: () => void;
  restoreSession: (session: DesignSession) => void;
}

const toTileRef = (url: string | null, workId: string | null) =>
  url && workId ? { url, workId } : null;

export function useSessionRestore(
  options: UseSessionRestoreOptions = {},
): SessionRestoreState {
  const { onRestored } = options;
  const restoreSessionState = useDesignChatStore(
    (state) => state.restoreSessionState,
  );

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pendingSession, setPendingSession] = useState<DesignSession | null>(
    null,
  );
  const onRestoredRef = useRef(onRestored);

  const { data: sessionMessages } = useDesignSessionMessagesQuery(
    pendingSession?.id ?? "",
  );

  useEffect(() => {
    onRestoredRef.current = onRestored;
  }, [onRestored]);

  useEffect(() => {
    if (!pendingSession || !sessionMessages) {
      return;
    }

    const repeatTile = toTileRef(
      pendingSession.repeatTileUrl,
      pendingSession.repeatTileWorkId,
    );
    const accentTile = toTileRef(
      pendingSession.accentTileUrl,
      pendingSession.accentTileWorkId,
    );
    const restoredFabricMethod = fabricTypeToFabricMethod(
      pendingSession.fabricType,
    );
    const designContext = restoredFabricMethod
      ? {
          ...(sessionMessages.designContext ?? {}),
          fabricMethod: restoredFabricMethod,
        }
      : sessionMessages.designContext;

    restoreSessionState(pendingSession.id, {
      ...sessionMessages,
      designContext,
      baseImageWorkId: pendingSession.lastImageWorkId,
      repeatTile,
      accentTile,
      accentLayout: pendingSession.accentLayout,
      patternType: pendingSession.patternType,
      fabricType: pendingSession.fabricType,
    });

    setPendingSession(null);
    onRestoredRef.current?.();
  }, [pendingSession, restoreSessionState, sessionMessages]);

  const openHistory = () => {
    setIsHistoryOpen(true);
  };

  const closeHistory = () => {
    setIsHistoryOpen(false);
  };

  const restoreSession = (session: DesignSession) => {
    setIsHistoryOpen(false);
    setPendingSession(session);
  };

  return {
    isHistoryOpen,
    openHistory,
    closeHistory,
    restoreSession,
  };
}
