import { useQueryClient } from "@tanstack/react-query";
import { useAiDesignMutation, DESIGN_TOKEN_BALANCE_QUERY_KEY } from "@/features/design/api/ai-design-query";
import { type AiDesignResponse, InsufficientTokensError } from "@/features/design/api/ai-design-api";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import type { Attachment, Message } from "@/features/design/types/chat";

interface UseDesignChatResult {
  sendMessage: (userText: string, attachments: Attachment[]) => void;
  regenerate: () => void;
  isLoading: boolean;
}

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

export function useDesignChat(): UseDesignChatResult {
  const queryClient = useQueryClient();
  const messages = useDesignChatStore((state) => state.messages);
  const designContext = useDesignChatStore((state) => state.designContext);
  const aiModel = useDesignChatStore((state) => state.aiModel);
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

  const createMutationCallbacks = (errorContent: string, errorStatus: "idle" | "completed") => ({
    onSuccess: (data: AiDesignResponse) => {
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
      void queryClient.invalidateQueries({ queryKey: DESIGN_TOKEN_BALANCE_QUERY_KEY });
      // TODO: 대화 히스토리 DB 저장 연동
    },
    onError: (error: Error) => {
      let content = errorContent;

      if (error instanceof InsufficientTokensError) {
        content = `토큰이 부족합니다. 현재 잔액: ${error.balance}토큰, 필요: ${error.cost}토큰`;
      }

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "ai",
        content,
        timestamp: Date.now(),
      };

      addMessage(errorMessage);
      setGenerationStatus(error instanceof InsufficientTokensError ? "idle" : errorStatus);
    },
  });

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
      designContext,
    };

    addMessage(userMessage);
    clearAttachments();
    setGenerationStatus("generating");

    mutation.mutate(
      {
        userMessage: userText,
        attachments,
        designContext,
        aiModel,
        conversationHistory: toConversationHistory([...messages, userMessage]),
      },
      createMutationCallbacks(
        "죄송합니다. 디자인 생성 중 오류가 발생했습니다. 다시 시도해 주세요.",
        "idle",
      ),
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
        designContext: lastUserMessage.designContext ?? designContext,
        aiModel,
        conversationHistory: toConversationHistory(messages),
      },
      createMutationCallbacks(
        "죄송합니다. 디자인 재생성 중 오류가 발생했습니다. 다시 시도해 주세요.",
        "completed",
      ),
    );
  };

  return {
    sendMessage,
    regenerate,
    isLoading: generationStatus === "generating" || generationStatus === "regenerating",
  };
}
