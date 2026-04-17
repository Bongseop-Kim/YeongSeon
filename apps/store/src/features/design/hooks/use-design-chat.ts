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
import { toPreviewBackground } from "@/shared/lib/to-preview-background";
import { ph } from "@/shared/lib/posthog";

interface UseDesignChatOptions {
  onGenerationStart?: (sessionId: string) => void;
  onGenerationEnd?: () => void;
}

interface UseDesignChatResult {
  sendMessage: (userText: string, attachments: Attachment[]) => void;
  regenerate: () => void;
  requestRender: () => void;
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

const toSerializedAttachments = (attachments: Attachment[] | undefined) =>
  attachments?.map(({ type, label, value }) => ({
    type,
    label,
    value,
  }));

const getSerializedImageFields = (message: Message) => {
  if (message.imageUrl || message.imageFileId) {
    return {
      imageUrl: message.imageUrl ?? null,
      imageFileId: message.imageFileId ?? null,
    };
  }

  const imageAttachment = message.attachments?.find(
    (attachment) => attachment.type === "image",
  );

  return {
    imageUrl: imageAttachment?.value ?? null,
    imageFileId: null,
  };
};

const toSessionPayload = (messages: Message[]) => {
  const visible = messages.filter((m) => !m.uiOnly);
  const firstUserMsg = visible.find((m) => m.role === "user");
  const allMessages = visible.map((m, idx) => ({
    ...getSerializedImageFields(m),
    id: m.id,
    role: m.role,
    content: m.content,
    attachments: toSerializedAttachments(m.attachments),
    sequenceNumber: idx,
  }));
  return { firstUserMsg, allMessages };
};

export function useDesignChat(
  options: UseDesignChatOptions = {},
): UseDesignChatResult {
  const { onGenerationStart, onGenerationEnd } = options;
  const queryClient = useQueryClient();
  const messages = useDesignChatStore((state) => state.messages);
  const designContext = useDesignChatStore((state) => state.designContext);
  const aiModel = useDesignChatStore((state) => state.aiModel);
  const autoGenerateImage = useDesignChatStore(
    (state) => state.autoGenerateImage,
  );
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
  const setLastAnalysisResult = useDesignChatStore(
    (state) => state.setLastAnalysisResult,
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

  const createMutationCallbacks = (
    errorContent: string,
    errorStatus: "idle" | "completed",
  ) => ({
    onSuccess: (data: AiDesignResponse) => {
      setLastAnalysisResult({
        analysisWorkId: data.analysisWorkId ?? null,
        eligibleForRender: data.eligibleForRender ?? false,
        missingRequirements: data.missingRequirements ?? [],
      });

      const previewBackground = data.imageUrl
        ? toPreviewBackground(data.imageUrl)
        : undefined;

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: "ai",
        content: data.aiMessage,
        imageUrl: data.imageUrl ?? undefined,
        contextChips: data.contextChips,
        timestamp: Date.now(),
      };

      addMessage(aiMessage);
      if (previewBackground) {
        setGeneratedImage(previewBackground, data.tags);
      }
      setGenerationStatus("completed");

      // pending flag 해제 — 서버에서 저장 완료됐으므로 알림 불필요
      onGenerationEnd?.();

      void queryClient.invalidateQueries({
        queryKey: DESIGN_TOKEN_BALANCE_QUERY_KEY,
      });
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

      // 에러 시에도 pending flag 해제 (생성 실패 = 확인할 결과 없음)
      onGenerationEnd?.();
    },
  });

  const submitDesignRequest = (
    request: Parameters<typeof mutation.mutate>[0],
    errorContent: string,
    errorStatus: "idle" | "completed",
  ): void => {
    mutation.mutate(
      request,
      createMutationCallbacks(errorContent, errorStatus),
    );
  };

  const sendMessage = (userText: string, attachments: Attachment[]): void => {
    if (userText.trim().length === 0) {
      return;
    }

    const prevSessionId = useDesignChatStore.getState().currentSessionId;
    const sessionId = prevSessionId ?? crypto.randomUUID();

    if (!prevSessionId) {
      setCurrentSessionId(sessionId);
      ph.capture("design_session_started", { ai_model: aiModel });
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

    onGenerationStart?.(sessionId);
    setLastAnalysisResult({
      analysisWorkId: null,
      eligibleForRender: false,
      missingRequirements: [],
    });

    const { firstUserMsg, allMessages } = toSessionPayload(
      useDesignChatStore.getState().messages,
    );

    submitDesignRequest(
      {
        userMessage: userText,
        attachments,
        designContext,
        aiModel,
        conversationHistory: toConversationHistory([...messages, userMessage]),
        sessionId,
        firstMessage: firstUserMsg?.content ?? userText,
        allMessages,
        executionMode: autoGenerateImage ? "auto" : "analysis_only",
        analysisWorkId: null,
      },
      "죄송합니다. 디자인 생성 중 오류가 발생했습니다. 다시 시도해 주세요.",
      "idle",
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
    onGenerationStart?.(sessionId);
    setLastAnalysisResult({
      analysisWorkId: null,
      eligibleForRender: false,
      missingRequirements: [],
    });

    const { firstUserMsg, allMessages } = toSessionPayload(
      useDesignChatStore.getState().messages,
    );

    submitDesignRequest(
      {
        userMessage: lastUserMessage.content,
        attachments: lastUserMessage.attachments ?? [],
        designContext: lastUserMessage.designContext ?? designContext,
        aiModel,
        conversationHistory: toConversationHistory(messages),
        sessionId,
        firstMessage: firstUserMsg?.content ?? lastUserMessage.content,
        allMessages,
        executionMode: autoGenerateImage ? "auto" : "analysis_only",
      },
      "죄송합니다. 디자인 재생성 중 오류가 발생했습니다. 다시 시도해 주세요.",
      "completed",
    );
  };

  const requestRender = (): void => {
    const {
      currentSessionId: storeSessionId,
      lastAnalysisWorkId: currentLastAnalysisWorkId,
      lastEligibleForRender: currentLastEligibleForRender,
    } = useDesignChatStore.getState();

    if (!currentLastAnalysisWorkId || !currentLastEligibleForRender) {
      return;
    }

    const { firstUserMsg, allMessages } = toSessionPayload(
      useDesignChatStore.getState().messages,
    );

    if (!firstUserMsg) {
      return;
    }

    const sessionId = storeSessionId ?? crypto.randomUUID();
    if (!storeSessionId) {
      setCurrentSessionId(sessionId);
    }

    setGenerationStatus("rendering");
    onGenerationStart?.(sessionId);

    submitDesignRequest(
      {
        userMessage: firstUserMsg.content,
        attachments: firstUserMsg.attachments ?? [],
        designContext: firstUserMsg.designContext ?? designContext,
        aiModel,
        conversationHistory: toConversationHistory(messages),
        sessionId,
        firstMessage: firstUserMsg.content,
        allMessages,
        executionMode: "render_from_analysis",
        analysisWorkId: currentLastAnalysisWorkId,
      },
      "죄송합니다. 이미지 렌더링 중 오류가 발생했습니다. 다시 시도해 주세요.",
      "completed",
    );
  };

  return {
    sendMessage,
    regenerate,
    requestRender,
    isLoading:
      generationStatus === "generating" ||
      generationStatus === "regenerating" ||
      generationStatus === "rendering",
  };
}
