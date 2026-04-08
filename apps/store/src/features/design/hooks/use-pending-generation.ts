import { useState } from "react";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";

const STORAGE_KEY = "pending_design_generation";

interface PendingEntry {
  sessionId: string;
  timestamp: number;
}

export function usePendingGeneration() {
  const [hasPendingResult, setHasPendingResult] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const currentStatus = useDesignChatStore.getState().generationStatus;
      return currentStatus === "idle" || currentStatus === "completed";
    } catch {
      return false;
    }
  });

  const markPending = (sessionId: string): void => {
    try {
      const entry: PendingEntry = { sessionId, timestamp: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    } catch {
      // localStorage 접근 불가 환경 무시
    }
    setHasPendingResult(true);
  };

  const clearPending = (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setHasPendingResult(false);
  };

  return { hasPendingResult, markPending, clearPending };
}
