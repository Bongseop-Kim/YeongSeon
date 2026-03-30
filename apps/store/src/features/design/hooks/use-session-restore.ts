import { useEffect, useRef, useState } from "react";

import { toRestoredDesignSessionState } from "@/features/design/utils/design-session-mapper";
import { useDesignSessionMessagesQuery } from "@/features/design/hooks/design-session-query";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import type { DesignSession } from "@/features/design/types/session";

interface UseSessionRestoreOptions {
  onRestored?: () => void;
}

interface SessionRestoreState {
  isHistoryOpen: boolean;
  openHistory: () => void;
  closeHistory: () => void;
  restoreSession: (session: DesignSession) => void;
}

export function useSessionRestore(
  options: UseSessionRestoreOptions = {},
): SessionRestoreState {
  const { onRestored } = options;
  const restoreSessionState = useDesignChatStore(
    (state) => state.restoreSessionState,
  );

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const onRestoredRef = useRef(onRestored);

  const { data: sessionMessages } = useDesignSessionMessagesQuery(
    pendingSessionId ?? "",
  );

  useEffect(() => {
    onRestoredRef.current = onRestored;
  }, [onRestored]);

  useEffect(() => {
    if (!pendingSessionId || !sessionMessages) {
      return;
    }

    restoreSessionState(
      pendingSessionId,
      toRestoredDesignSessionState(sessionMessages),
    );

    setPendingSessionId(null);
    onRestoredRef.current?.();
  }, [pendingSessionId, restoreSessionState, sessionMessages]);

  const openHistory = () => {
    setIsHistoryOpen(true);
  };

  const closeHistory = () => {
    setIsHistoryOpen(false);
  };

  const restoreSession = (session: DesignSession) => {
    setIsHistoryOpen(false);
    setPendingSessionId(session.id);
  };

  return {
    isHistoryOpen,
    openHistory,
    closeHistory,
    restoreSession,
  };
}
