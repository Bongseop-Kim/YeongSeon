import { useEffect, useState } from "react";

import type { Conversation } from "@/features/design/types/chat";

const STORAGE_KEY = "ai-design-conversations";
const MAX_CONVERSATIONS = 20;

const isBrowser = (): boolean => typeof window !== "undefined";

export function loadConversations(): Conversation[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }
    return parsedValue.filter(
      (item): item is Conversation =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).id === "string" &&
        typeof (item as Record<string, unknown>).title === "string" &&
        Array.isArray((item as Record<string, unknown>).messages),
    );
  } catch {
    return [];
  }
}

export function saveConversation(conversation: Conversation): void {
  if (!isBrowser()) {
    return;
  }

  const conversations = loadConversations();
  const nextConversations = [
    conversation,
    ...conversations.filter((item) => item.id !== conversation.id),
  ].slice(0, MAX_CONVERSATIONS);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextConversations));
}

export function deleteConversation(id: string): void {
  if (!isBrowser()) {
    return;
  }

  const conversations = loadConversations().filter(
    (conversation) => conversation.id !== id,
  );

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

export function useDesignHistory() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    setConversations(loadConversations());
  }, []);

  return {
    conversations,
    saveConversation: (conversation: Conversation) => {
      saveConversation(conversation);
      setConversations(loadConversations());
    },
    deleteConversation: (id: string) => {
      deleteConversation(id);
      setConversations(loadConversations());
    },
  };
}
