import { useQueryClient } from "@tanstack/react-query";
import {
  useAiDesignMutation,
  DESIGN_TOKEN_BALANCE_QUERY_KEY,
} from "@/features/design/hooks/ai-design-query";
import {
  type AiDesignResponse,
  InsufficientTokensError,
} from "@/entities/design";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import type { Attachment, Message } from "@/features/design/types/chat";
import { uploadGeneratedImage } from "@/features/design/utils/imagekit-upload";
import { useSaveDesignSessionMutation } from "@/features/design/hooks/design-session-query";
import { toPreviewBackground } from "@/features/design/utils";

interface UseDesignChatResult {
  sendMessage: (userText: string, attachments: Attachment[]) => void;
  regenerate: () => void;
  isLoading: boolean;
}

const toConversationHistory = (
  items: Message[],
): { role: "user" | "ai"; content: string }[] =>
  items
    .filter((message) => !message.uiOnly && message.content.trim().length > 0)
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
  const clearAttachments = useDesignChatStore(
    (state) => state.clearAttachments,
  );
  const currentSessionId = useDesignChatStore(
    (state) => state.currentSessionId,
  );
  const setCurrentSessionId = useDesignChatStore(
    (state) => state.setCurrentSessionId,
  );
  const mutation = useAiDesignMutation();
  const saveSessionMutation = useSaveDesignSessionMutation();

  const createMutationCallbacks = (
    errorContent: string,
    errorStatus: "idle" | "completed",
    sessionId: string,
  ) => ({
    onSuccess: (data: AiDesignResponse) => {
      const previewBackground = data.imageUrl
        ? toPreviewBackground(data.imageUrl)
        : undefined;

      const aiMessageId = crypto.randomUUID();
      const aiMessage: Message = {
        id: aiMessageId,
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
      void queryClient.invalidateQueries({
        queryKey: DESIGN_TOKEN_BALANCE_QUERY_KEY,
      });

      // ImageKit 업로드 + 세션 저장 (백그라운드, 실패해도 채팅에 영향 없음)
      const doSave = async () => {
        let rawImageUrl: string | null = null;
        let rawImageFileId: string | null = null;

        if (data.imageUrl) {
          const uploaded = await uploadGeneratedImage(data.imageUrl);
          rawImageUrl = uploaded?.url ?? null;
          rawImageFileId = uploaded?.fileId ?? null;
        }

        const { messages: allMessages, aiModel: currentAiModel } =
          useDesignChatStore.getState();
        const firstUserMsg = allMessages.find(
          (m) => m.role === "user" && !m.uiOnly,
        );

        const savableMessages = allMessages
          .filter((m) => !m.uiOnly)
          .map((m, idx) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            imageUrl:
              m.id === aiMessageId ? rawImageUrl : (m.rawImageUrl ?? null),
            imageFileId: m.id === aiMessageId ? rawImageFileId : null,
            sequenceNumber: idx,
          }));

        saveSessionMutation.mutate({
          sessionId,
          aiModel: currentAiModel,
          firstMessage: firstUserMsg?.content ?? "",
          lastImageUrl: rawImageUrl,
          lastImageFileId: rawImageFileId,
          messages: savableMessages,
        });
      };

      void doSave();
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
        uiOnly: true,
      };

      addMessage(errorMessage);
      setGenerationStatus(
        error instanceof InsufficientTokensError ? "idle" : errorStatus,
      );
    },
  });

  const sendMessage = (userText: string, attachments: Attachment[]): void => {
    if (userText.trim().length === 0) {
      return;
    }

    const sessionId = currentSessionId ?? crypto.randomUUID();
    if (!currentSessionId) {
      setCurrentSessionId(sessionId);
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
        sessionId,
      ),
    );
  };

  const regenerate = (): void => {
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");

    if (!lastUserMessage) {
      return;
    }

    const sessionId = currentSessionId ?? crypto.randomUUID();
    if (!currentSessionId) {
      setCurrentSessionId(sessionId);
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
        sessionId,
      ),
    );
  };

  return {
    sendMessage,
    regenerate,
    isLoading:
      generationStatus === "generating" || generationStatus === "regenerating",
  };
}
