import { useQueryClient } from "@tanstack/react-query";
import {
  useAiDesignMutation,
  DESIGN_TOKEN_BALANCE_QUERY_KEY,
} from "@/features/design/hooks/ai-design-query";
import {
  resolveGenerationRoute,
  type AiDesignResponse,
  InsufficientTokensError,
  type GenerationRouteSignal,
} from "@/entities/design";
import { createAnalysisReuseKeyForContext } from "@/entities/design/api/analysis-reuse-key";
import {
  getRawImageUrlFromPreviewBackground,
  useDesignChatStore,
} from "@/features/design/store/design-chat-store";
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
  requestInpaint: (maskBase64: string, editPrompt: string) => void;
  isLoading: boolean;
}

interface MutationCallbackOptions {
  skipAiMessageAppend?: boolean;
}

const EDIT_INTENT_SIGNALS = new Set<GenerationRouteSignal>([
  "edit_only",
  "exact_placement",
  "modification_intent",
  "preserve_identity",
]);
const EDIT_BASE_IMAGE_REQUIRED_MESSAGE =
  "현재 결과를 기준으로 수정할 이미지가 없어 먼저 디자인을 생성해 주세요.";

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

const isEditIntent = (signals: GenerationRouteSignal[]) =>
  signals.some((signal) => EDIT_INTENT_SIGNALS.has(signal));

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

const createAnalysisReset = () => ({
  analysisWorkId: null,
  eligibleForRender: false,
  missingRequirements: [],
});

const createEditRequestBase = (
  editIntent: boolean,
  baseImageUrl: string | null,
  baseImageWorkId: string | null,
) => (editIntent ? { baseImageUrl, baseImageWorkId } : {});

export function useDesignChat(
  options: UseDesignChatOptions = {},
): UseDesignChatResult {
  const { onGenerationStart, onGenerationEnd } = options;
  const queryClient = useQueryClient();
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
  const setGenerationMetadata = useDesignChatStore(
    (state) => state.setGenerationMetadata,
  );
  const setLastAnalysisResult = useDesignChatStore(
    (state) => state.setLastAnalysisResult,
  );
  const setLastAnalysisReuseKey = useDesignChatStore(
    (state) => state.setLastAnalysisReuseKey,
  );
  const clearAttachments = useDesignChatStore(
    (state) => state.clearAttachments,
  );
  const restoreMessages = useDesignChatStore((state) => state.restoreMessages);
  const setCurrentSessionId = useDesignChatStore(
    (state) => state.setCurrentSessionId,
  );
  const mutation = useAiDesignMutation();

  const createMutationCallbacks = (
    request: Parameters<typeof mutation.mutate>[0],
    errorContent: string,
    errorStatus: "idle" | "completed",
    callbackOptions: MutationCallbackOptions = {},
  ) => ({
    onSuccess: (data: AiDesignResponse) => {
      const currentState = useDesignChatStore.getState();
      const nextBaseImageUrl = data.imageUrl ?? currentState.baseImageUrl;
      const nextBaseImageWorkId =
        data.imageUrl != null
          ? (data.workId ?? null)
          : currentState.baseImageWorkId;

      setLastAnalysisResult({
        analysisWorkId: data.analysisWorkId ?? null,
        eligibleForRender: data.eligibleForRender ?? false,
        missingRequirements: data.missingRequirements ?? [],
      });
      setLastAnalysisReuseKey(
        data.analysisWorkId
          ? createAnalysisReuseKeyForContext(
              request.designContext,
              request.baseImageUrl ?? null,
              request.baseImageWorkId ?? null,
            )
          : null,
      );

      setGenerationMetadata({
        baseImageUrl: nextBaseImageUrl,
        baseImageWorkId: nextBaseImageWorkId,
        lastRoute: data.route ?? null,
        lastRouteSignals: data.routeSignals ?? [],
        lastRouteReason: data.routeReason ?? null,
        lastFalRequestId: data.falRequestId ?? null,
        lastSeed: data.seed ?? null,
      });

      const previewBackground = data.imageUrl
        ? toPreviewBackground(data.imageUrl)
        : undefined;

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: "ai",
        content: data.aiMessage,
        imageUrl: data.imageUrl ?? undefined,
        workId: data.workId ?? null,
        contextChips: data.contextChips,
        timestamp: Date.now(),
      };

      if (callbackOptions.skipAiMessageAppend) {
        const nextMessages = [...useDesignChatStore.getState().messages];

        for (let index = nextMessages.length - 1; index >= 0; index -= 1) {
          const message = nextMessages[index];
          if (message.role !== "ai" || message.uiOnly) {
            continue;
          }

          nextMessages[index] = {
            ...message,
            imageUrl: data.imageUrl ?? message.imageUrl,
            workId: data.workId ?? message.workId ?? null,
            contextChips:
              data.contextChips.length > 0
                ? data.contextChips
                : message.contextChips,
          };
          break;
        }

        restoreMessages(nextMessages);
      } else {
        addMessage(aiMessage);
      }

      if (previewBackground) {
        setGeneratedImage(previewBackground, data.tags);
      }
      setGenerationStatus("completed");

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
      setLastAnalysisReuseKey(null);

      onGenerationEnd?.();
    },
  });

  const submitDesignRequest = (
    request: Parameters<typeof mutation.mutate>[0],
    errorContent: string,
    errorStatus: "idle" | "completed",
    callbackOptions: MutationCallbackOptions = {},
  ): void => {
    mutation.mutate(
      request,
      createMutationCallbacks(
        request,
        errorContent,
        errorStatus,
        callbackOptions,
      ),
    );
  };

  const sendMessage = (userText: string, attachments: Attachment[]): void => {
    if (userText.trim().length === 0) {
      return;
    }

    const storeState = useDesignChatStore.getState();
    const aiModel = storeState.aiModel;
    const designContext = storeState.designContext;
    const selectedPreviewImageUrl = storeState.selectedPreviewImageUrl;
    const baseImageUrl = getRawImageUrlFromPreviewBackground(
      storeState.baseImageUrl ?? selectedPreviewImageUrl,
    );
    const baseImageWorkId = storeState.baseImageWorkId;
    const routeResolution = resolveGenerationRoute({
      userMessage: userText,
      hasCiImage: !!designContext.ciImage,
      hasReferenceImage: !!designContext.referenceImage,
      hasPreviousGeneratedImage: !!baseImageUrl,
      selectedPreviewImageUrl,
      detectedPattern: designContext.pattern,
    });
    const editIntent = isEditIntent(routeResolution.signals);

    if (editIntent && !baseImageUrl) {
      addMessage({
        id: crypto.randomUUID(),
        role: "ai",
        content: EDIT_BASE_IMAGE_REQUIRED_MESSAGE,
        timestamp: Date.now(),
        uiOnly: true,
      });
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
    const nextMessages = [...storeState.messages, userMessage];

    const prevSessionId = storeState.currentSessionId;
    const sessionId = prevSessionId ?? crypto.randomUUID();

    if (!prevSessionId) {
      setCurrentSessionId(sessionId);
      ph.capture("design_session_started", { ai_model: aiModel });
    }

    addMessage(userMessage);
    clearAttachments();

    setGenerationStatus("generating");

    onGenerationStart?.(sessionId);
    setLastAnalysisResult(createAnalysisReset());
    setLastAnalysisReuseKey(null);

    const { firstUserMsg, allMessages } = toSessionPayload(nextMessages);

    submitDesignRequest(
      {
        userMessage: userText,
        attachments,
        designContext,
        aiModel,
        conversationHistory: toConversationHistory(nextMessages),
        sessionId,
        firstMessage: firstUserMsg?.content ?? userText,
        allMessages,
        executionMode: "auto",
        analysisWorkId: null,
        ...createEditRequestBase(editIntent, baseImageUrl, baseImageWorkId),
      },
      "죄송합니다. 디자인 생성 중 오류가 발생했습니다. 다시 시도해 주세요.",
      "idle",
    );
  };

  const regenerate = (): void => {
    const storeState = useDesignChatStore.getState();
    const aiModel = storeState.aiModel;
    const designContext = storeState.designContext;
    const selectedPreviewImageUrl = storeState.selectedPreviewImageUrl;
    const baseImageUrl = getRawImageUrlFromPreviewBackground(
      storeState.baseImageUrl ?? selectedPreviewImageUrl,
    );
    const baseImageWorkId = storeState.baseImageWorkId;
    const lastUserMessage = [...storeState.messages]
      .reverse()
      .find((m) => m.role === "user");

    if (!lastUserMessage) {
      return;
    }

    const routeResolution = resolveGenerationRoute({
      userMessage: lastUserMessage.content,
      hasCiImage: !!(lastUserMessage.designContext ?? designContext).ciImage,
      hasReferenceImage: !!(lastUserMessage.designContext ?? designContext)
        .referenceImage,
      hasPreviousGeneratedImage: !!baseImageUrl,
      selectedPreviewImageUrl,
      detectedPattern: (lastUserMessage.designContext ?? designContext).pattern,
    });
    const editIntent = isEditIntent(routeResolution.signals);

    if (editIntent && !baseImageUrl) {
      addMessage({
        id: crypto.randomUUID(),
        role: "ai",
        content: EDIT_BASE_IMAGE_REQUIRED_MESSAGE,
        timestamp: Date.now(),
        uiOnly: true,
      });
      return;
    }

    const sessionId = storeState.currentSessionId ?? crypto.randomUUID();
    if (!storeState.currentSessionId) {
      setCurrentSessionId(sessionId);
    }

    setGenerationStatus("regenerating");
    onGenerationStart?.(sessionId);
    setLastAnalysisResult(createAnalysisReset());
    setLastAnalysisReuseKey(null);

    const { firstUserMsg, allMessages } = toSessionPayload(storeState.messages);

    submitDesignRequest(
      {
        userMessage: lastUserMessage.content,
        attachments: lastUserMessage.attachments ?? [],
        designContext: lastUserMessage.designContext ?? designContext,
        aiModel,
        conversationHistory: toConversationHistory(storeState.messages),
        sessionId,
        firstMessage: firstUserMsg?.content ?? lastUserMessage.content,
        allMessages,
        executionMode: "auto",
        ...createEditRequestBase(editIntent, baseImageUrl, baseImageWorkId),
      },
      "죄송합니다. 디자인 재생성 중 오류가 발생했습니다. 다시 시도해 주세요.",
      "completed",
    );
  };

  const requestRender = (): void => {
    const storeState = useDesignChatStore.getState();
    const aiModel = storeState.aiModel;
    const {
      currentSessionId: storeSessionId,
      lastAnalysisWorkId: currentLastAnalysisWorkId,
      lastEligibleForRender: currentLastEligibleForRender,
      lastAnalysisReuseKey: currentLastAnalysisReuseKey,
    } = storeState;

    if (!currentLastAnalysisWorkId || !currentLastEligibleForRender) {
      return;
    }

    const { firstUserMsg, allMessages } = toSessionPayload(storeState.messages);

    if (!firstUserMsg) {
      return;
    }

    const sessionId = storeSessionId ?? crypto.randomUUID();
    if (!storeSessionId) {
      setCurrentSessionId(sessionId);
    }

    const currentBaseImageUrl = getRawImageUrlFromPreviewBackground(
      storeState.baseImageUrl ?? storeState.selectedPreviewImageUrl,
    );
    const currentBaseImageWorkId = storeState.baseImageWorkId;
    const currentReuseKey = createAnalysisReuseKeyForContext(
      storeState.designContext,
      currentBaseImageUrl,
      currentBaseImageWorkId,
    );
    const canReuseAnalysis = currentLastAnalysisReuseKey === currentReuseKey;
    const executionMode = canReuseAnalysis ? "render_from_analysis" : "auto";

    setGenerationStatus("rendering");
    onGenerationStart?.(sessionId);
    if (!canReuseAnalysis) {
      setLastAnalysisResult(createAnalysisReset());
      setLastAnalysisReuseKey(null);
    }

    submitDesignRequest(
      {
        userMessage: firstUserMsg.content,
        attachments: firstUserMsg.attachments ?? [],
        designContext: storeState.designContext,
        aiModel,
        conversationHistory: toConversationHistory(storeState.messages),
        sessionId,
        firstMessage: firstUserMsg.content,
        allMessages,
        executionMode,
        analysisWorkId: canReuseAnalysis ? currentLastAnalysisWorkId : null,
        ...(currentBaseImageUrl
          ? {
              baseImageUrl: currentBaseImageUrl,
              baseImageWorkId: currentBaseImageWorkId,
            }
          : {}),
      },
      "죄송합니다. 이미지 렌더링 중 오류가 발생했습니다. 다시 시도해 주세요.",
      "completed",
      {
        skipAiMessageAppend: true,
      },
    );
  };

  const requestInpaint = (maskBase64: string, editPrompt: string): void => {
    const trimmedPrompt = editPrompt.trim();
    if (maskBase64.trim().length === 0 || trimmedPrompt.length === 0) {
      return;
    }

    const storeState = useDesignChatStore.getState();
    const aiModel = storeState.aiModel;
    const targetImageUrl =
      storeState.inpaintTarget?.imageUrl ??
      getRawImageUrlFromPreviewBackground(
        storeState.baseImageUrl ?? storeState.selectedPreviewImageUrl,
      );
    const targetImageWorkId =
      storeState.inpaintTarget?.imageWorkId ?? storeState.baseImageWorkId;

    if (!targetImageUrl) {
      addMessage({
        id: crypto.randomUUID(),
        role: "ai",
        content: EDIT_BASE_IMAGE_REQUIRED_MESSAGE,
        timestamp: Date.now(),
        uiOnly: true,
      });
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedPrompt,
      timestamp: Date.now(),
      designContext: storeState.designContext,
    };
    const nextMessages = [...storeState.messages, userMessage];
    const sessionId = storeState.currentSessionId ?? crypto.randomUUID();

    if (!storeState.currentSessionId) {
      setCurrentSessionId(sessionId);
    }

    addMessage(userMessage);
    setGenerationStatus("rendering");
    onGenerationStart?.(sessionId);
    setLastAnalysisResult(createAnalysisReset());
    setLastAnalysisReuseKey(null);

    const { firstUserMsg, allMessages } = toSessionPayload(nextMessages);

    submitDesignRequest(
      {
        userMessage: trimmedPrompt,
        attachments: [],
        designContext: storeState.designContext,
        aiModel,
        conversationHistory: toConversationHistory(nextMessages),
        sessionId,
        firstMessage: firstUserMsg?.content ?? trimmedPrompt,
        allMessages,
        executionMode: "auto",
        analysisWorkId: null,
        route: "fal_inpaint",
        baseImageUrl: targetImageUrl,
        baseImageWorkId: targetImageWorkId,
        maskBase64,
        maskMimeType: "image/png",
        editPrompt: trimmedPrompt,
      },
      "죄송합니다. 부분 수정 중 오류가 발생했습니다. 다시 시도해 주세요.",
      "completed",
    );
  };

  return {
    sendMessage,
    regenerate,
    requestRender,
    requestInpaint,
    isLoading:
      generationStatus === "generating" ||
      generationStatus === "regenerating" ||
      generationStatus === "rendering",
  };
}
