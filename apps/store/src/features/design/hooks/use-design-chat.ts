import { useAiDesignMutation } from "@/features/design/api/ai-design-query";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import type { Attachment, Message } from "@/features/design/types/chat";

interface UseDesignChatResult {
  sendMessage: (userText: string, attachments: Attachment[]) => void;
  regenerate: () => void;
  isLoading: boolean;
}

export function useDesignChat(): UseDesignChatResult {
  const messages = useDesignChatStore((state) => state.messages);
  const designContext = useDesignChatStore((state) => state.designContext);
  const generationStatus = useDesignChatStore(
    (state) => state.generationStatus,
  );
  const addMessage = useDesignChatStore((state) => state.addMessage);
  const setGenerationStatus = useDesignChatStore(
    (state) => state.setGenerationStatus,
  );
  const setGeneratedImage = useDesignChatStore(
    (state) => state.setGeneratedImage,
  );
  const clearAttachments = useDesignChatStore((state) => state.clearAttachments);
  const mutation = useAiDesignMutation();
  const toPreviewBackground = (imageUrl: string): string =>
    `url("${imageUrl}") center/cover no-repeat`;

  const toConversationHistory = (
    items: Message[],
  ): { role: "user" | "ai"; content: string }[] =>
    items
      .filter((message) => message.content.trim().length > 0)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

  const sendMessage = (userText: string, attachments: Attachment[]): void => {
    if (userText.trim().length === 0) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userText,
      attachments,
      timestamp: Date.now(),
    };

    addMessage(userMessage);
    clearAttachments();
    setGenerationStatus("generating");

    mutation.mutate(
      {
        userMessage: userText,
        attachments,
        designContext,
        conversationHistory: toConversationHistory([...messages, userMessage]),
      },
      {
        onSuccess: (data) => {
          const previewBackground = data.imageUrl
            ? toPreviewBackground(data.imageUrl)
            : undefined;
          const aiMessage: Message = {
            id: crypto.randomUUID(),
            role: "ai",
            content: data.aiMessage,
            imageUrl: previewBackground,
            contextChips: data.contextChips,
            timestamp: Date.now(),
          };

          addMessage(aiMessage);
          if (previewBackground) {
            setGeneratedImage(previewBackground, data.tags);
          }
          setGenerationStatus("completed");
          // TODO: 대화 히스토리 DB 저장 연동
        },
        onError: () => {
          const errorMessage: Message = {
            id: crypto.randomUUID(),
            role: "ai",
            content:
              "죄송합니다. 디자인 생성 중 오류가 발생했습니다. 다시 시도해 주세요.",
            timestamp: Date.now(),
          };

          addMessage(errorMessage);
          setGenerationStatus("idle");
        },
      },
    );
  };

  const regenerate = (): void => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");

    if (!lastUserMessage) {
      return;
    }

    setGenerationStatus("regenerating");

    mutation.mutate(
      {
        userMessage: lastUserMessage.content,
        attachments: lastUserMessage.attachments ?? [],
        designContext,
        conversationHistory: toConversationHistory(messages),
      },
      {
        onSuccess: (data) => {
          const previewBackground = data.imageUrl
            ? toPreviewBackground(data.imageUrl)
            : undefined;
          const aiMessage: Message = {
            id: crypto.randomUUID(),
            role: "ai",
            content: data.aiMessage,
            imageUrl: previewBackground,
            contextChips: data.contextChips,
            timestamp: Date.now(),
          };

          addMessage(aiMessage);
          if (previewBackground) {
            setGeneratedImage(previewBackground, data.tags);
          }
          setGenerationStatus("completed");
          // TODO: 대화 히스토리 DB 저장 연동
        },
        onError: () => {
          const errorMessage: Message = {
            id: crypto.randomUUID(),
            role: "ai",
            content: "죄송합니다. 디자인 재생성 중 오류가 발생했습니다. 다시 시도해 주세요.",
            timestamp: Date.now(),
          };

          addMessage(errorMessage);
          setGenerationStatus("completed");
        },
      },
    );
  };

  return {
    sendMessage,
    regenerate,
    isLoading: generationStatus === "generating" || generationStatus === "regenerating",
  };
}
