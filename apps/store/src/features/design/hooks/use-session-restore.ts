import { useEffect, useState } from "react";

import { toRestoredDesignSessionState } from "@/features/design/api/design-session-mapper";
import { useDesignSessionMessagesQuery } from "@/features/design/api/design-session-query";
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

  const { data: sessionMessages } = useDesignSessionMessagesQuery(
    pendingSessionId ?? "",
  );

  useEffect(() => {
    if (!pendingSessionId || !sessionMessages) {
      return;
    }

    restoreSessionState(
      pendingSessionId,
      toRestoredDesignSessionState(sessionMessages),
    );

    setPendingSessionId(null);
    onRestored?.();
  }, [onRestored, pendingSessionId, restoreSessionState, sessionMessages]);

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
