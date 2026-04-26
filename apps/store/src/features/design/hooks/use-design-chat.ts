import { useQueryClient } from "@tanstack/react-query";
import {
  useAiDesignMutation,
  DESIGN_TOKEN_BALANCE_QUERY_KEY,
} from "@/features/design/hooks/ai-design-query";
import {
  resolveGenerationRoute,
  createAnalysisReuseKeyForContext,
  isActiveGeneration,
  type AiDesignRequest,
  type AiDesignResponse,
  InsufficientTokensError,
  type GenerationRouteSignal,
  callTileGeneration,
  type TileGenerationPayload,
  fabricMethodToFabricType,
} from "@/entities/design";
import {
  getRawImageUrlFromPreviewBackground,
  useDesignChatStore,
} from "@/features/design/store/design-chat-store";
import { uploadDesignAsset } from "@/entities/design/api/upload-design-asset";
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
  requestInpaint: (
    maskBase64: string,
    editPrompt: string,
  ) => InpaintRequestResult;
  isLoading: boolean;
}

export type InpaintRequestResult =
  | { started: true }
  | {
      started: false;
      errorCode: "INVALID_INPUT" | "NO_EDIT_TARGET";
      errorMessage: string;
    };

interface MutationCallbackOptions {
  skipAiMessageAppend?: boolean;
}

type DesignChatStoreState = ReturnType<typeof useDesignChatStore.getState>;

const EDIT_INTENT_SIGNALS = new Set<GenerationRouteSignal>([
  "edit_only",
  "exact_placement",
  "modification_intent",
]);
const ANALYTICS_AI_MODEL = "openai" as const;
const TILE_GENERATION_SUCCESS_MESSAGE = "타일 기반 디자인을 생성했습니다.";
export const INPAINT_TARGET_REQUIRED_MESSAGE =
  "부분 수정할 이미지가 없습니다. 먼저 결과 이미지를 선택한 뒤 수정 영역을 지정해 주세요.";

const filterVisibleMessages = (items: Message[]): Message[] =>
  items.filter((m) => !m.uiOnly && m.content.trim().length > 0);

const findFirstUserMessage = (messages: Message[]): Message | undefined =>
  messages.find((m) => !m.uiOnly && m.role === "user");

const toConversationHistory = (
  items: Message[],
): { role: "user" | "ai"; content: string }[] =>
  filterVisibleMessages(items).map((message) => ({
    role: message.role,
    content: message.content,
  }));

const getMessagesBefore = (
  messages: Message[],
  messageId: string,
): Message[] => {
  const messageIndex = messages.findIndex(
    (message) => message.id === messageId,
  );

  return messageIndex === -1 ? messages : messages.slice(0, messageIndex);
};

const toSerializedAttachments = (attachments: Attachment[] | undefined) =>
  attachments?.map(({ type, label, value, file, fileName }) => ({
    type,
    label,
    value,
    fileName: fileName ?? file?.name,
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

const withResolvedImageAttachmentUrl = (
  allMessages: ReturnType<typeof toSessionPayload>["allMessages"],
  messageId: string,
  resolvedImageUrl: string | null,
): ReturnType<typeof toSessionPayload>["allMessages"] => {
  if (!resolvedImageUrl) {
    return allMessages;
  }

  const index = allMessages.findIndex((m) => m.id === messageId);
  if (index === -1) return allMessages;

  const message = allMessages[index];
  const updated = [...allMessages];
  updated[index] = {
    ...message,
    imageUrl: resolvedImageUrl,
    attachments: message.attachments?.map((attachment) =>
      attachment.type === "image"
        ? { ...attachment, value: resolvedImageUrl }
        : attachment,
    ),
  };
  return updated;
};

const resolveAttachedImageUrl = async (
  attachments: Attachment[],
): Promise<string | null> => {
  const imageAttachment = attachments.find(
    (attachment) => attachment.type === "image",
  );

  if (!imageAttachment) {
    return null;
  }

  if (imageAttachment.file) {
    const uploaded = await uploadDesignAsset(imageAttachment.file, {
      kind: "reference",
    });
    return uploaded.signedUrl;
  }

  return imageAttachment.value.startsWith("https://")
    ? imageAttachment.value
    : null;
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

const getBaseImageContext = (
  state: Pick<
    DesignChatStoreState,
    "baseImageUrl" | "selectedPreviewImageUrl" | "baseImageWorkId"
  >,
) => ({
  baseImageUrl: getRawImageUrlFromPreviewBackground(
    state.baseImageUrl ?? state.selectedPreviewImageUrl,
  ),
  baseImageWorkId: state.baseImageWorkId,
});

const getInpaintTarget = (
  state: Pick<
    DesignChatStoreState,
    | "inpaintTarget"
    | "baseImageUrl"
    | "selectedPreviewImageUrl"
    | "baseImageWorkId"
  >,
) =>
  state.inpaintTarget ?? {
    imageUrl: getBaseImageContext(state).baseImageUrl,
    imageWorkId: state.baseImageWorkId,
  };

const toApiConversationHistory = (
  items: Message[],
): Array<{ role: "user" | "assistant"; content: string }> =>
  filterVisibleMessages(items).map((m) => ({
    role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

const isTileGenerationMode = (
  state: Pick<DesignChatStoreState, "generatedImageUrl" | "repeatTile">,
): boolean => state.generatedImageUrl === null || state.repeatTile !== null;

const toInsufficientTokensMessage = (
  error: unknown,
  fallback: string,
): string =>
  error instanceof InsufficientTokensError
    ? `토큰이 부족합니다. 현재 잔액: ${error.balance}토큰, 필요: ${error.cost}토큰`
    : fallback;

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
  const setTileResult = useDesignChatStore((state) => state.setTileResult);
  const restoreMessages = useDesignChatStore((state) => state.restoreMessages);
  const setCurrentSessionId = useDesignChatStore(
    (state) => state.setCurrentSessionId,
  );
  const mutation = useAiDesignMutation();

  const resetAnalysisState = (): void => {
    setLastAnalysisResult(createAnalysisReset());
    setLastAnalysisReuseKey(null);
  };

  const ensureSessionId = (currentSessionId: string | null): string => {
    const sessionId = currentSessionId ?? crypto.randomUUID();

    if (!currentSessionId) {
      setCurrentSessionId(sessionId);
    }

    return sessionId;
  };

  const startGeneration = (
    status: "generating" | "regenerating" | "rendering",
    sessionId: string,
    { resetAnalysis = true }: { resetAnalysis?: boolean } = {},
  ): void => {
    setGenerationStatus(status);
    onGenerationStart?.(sessionId);

    if (resetAnalysis) {
      resetAnalysisState();
    }
  };

  const finalizeGenerationFailure = (
    content: string,
    status: "idle" | "completed" = "idle",
  ): void => {
    addMessage({
      id: crypto.randomUUID(),
      role: "ai",
      content,
      timestamp: Date.now(),
      uiOnly: true,
    });
    setGenerationStatus(status);
    onGenerationEnd?.();
  };

  const createRequest = (
    input: Omit<
      AiDesignRequest,
      "conversationHistory" | "firstMessage" | "allMessages"
    > & {
      messages: Message[];
    },
  ): AiDesignRequest => {
    const { messages, ...request } = input;
    const { firstUserMsg, allMessages } = toSessionPayload(messages);

    return {
      ...request,
      conversationHistory: toConversationHistory(messages),
      firstMessage: firstUserMsg?.content ?? request.userMessage,
      allMessages,
    };
  };

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
        content: data.patternPreparationMessage
          ? `${data.patternPreparationMessage}\n\n${data.aiMessage}`
          : data.aiMessage,
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
      setLastAnalysisReuseKey(null);
      finalizeGenerationFailure(
        toInsufficientTokensMessage(error, errorContent),
        error instanceof InsufficientTokensError ? "idle" : errorStatus,
      );
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

  const submitTileDesignRequest = async (input: {
    userText: string;
    attachments: Attachment[];
    messages: Message[];
    activeUserMessageId: string;
    sessionId: string;
  }): Promise<void> => {
    const state = useDesignChatStore.getState();
    const { firstUserMsg, allMessages } = toSessionPayload(input.messages);
    const priorMessages = getMessagesBefore(
      input.messages,
      input.activeUserMessageId,
    );
    const route: TileGenerationPayload["route"] = state.repeatTile
      ? "tile_edit"
      : "tile_generation";

    try {
      const attachedImageUrl = await resolveAttachedImageUrl(input.attachments);
      const sessionMessages = withResolvedImageAttachmentUrl(
        allMessages,
        input.activeUserMessageId,
        attachedImageUrl,
      );
      const uiFabricType = fabricMethodToFabricType(
        state.designContext.fabricMethod,
      );
      const result = await callTileGeneration({
        route,
        userMessage: input.userText,
        uiFabricType,
        previousFabricType: state.fabricType,
        previousRepeatTileUrl: state.repeatTile?.url ?? null,
        previousRepeatTileWorkId: state.repeatTile?.workId ?? null,
        previousAccentTileUrl: state.accentTile?.url ?? null,
        previousAccentTileWorkId: state.accentTile?.workId ?? null,
        previousAccentLayoutJson: state.accentLayout,
        conversationHistory: toApiConversationHistory(priorMessages),
        attachedImageUrl,
        sessionId: input.sessionId,
        workflowId: crypto.randomUUID(),
        firstMessage: firstUserMsg?.content ?? input.userText,
        allMessages: sessionMessages,
      });

      setTileResult({
        repeatTile: {
          url: result.repeatTileUrl,
          workId: result.repeatTileWorkId,
        },
        accentTile:
          result.accentTileUrl && result.accentTileWorkId
            ? {
                url: result.accentTileUrl,
                workId: result.accentTileWorkId,
              }
            : null,
        accentLayout: result.accentLayout,
        patternType: result.patternType,
        fabricType: result.fabricType,
      });
      setGeneratedImage(toPreviewBackground(result.repeatTileUrl), []);
      addMessage({
        id: crypto.randomUUID(),
        role: "ai",
        content: TILE_GENERATION_SUCCESS_MESSAGE,
        imageUrl: result.repeatTileUrl,
        workId: result.repeatTileWorkId,
        timestamp: Date.now(),
      });
      setGenerationStatus("completed");
      onGenerationEnd?.();

      void queryClient.invalidateQueries({
        queryKey: DESIGN_TOKEN_BALANCE_QUERY_KEY,
      });
    } catch (error) {
      console.error("tile generation failed:", error);
      finalizeGenerationFailure(
        toInsufficientTokensMessage(
          error,
          "죄송합니다. 타일 기반 디자인 생성 중 오류가 발생했습니다. 다시 시도해 주세요.",
        ),
      );
    }
  };

  const sendMessage = (userText: string, attachments: Attachment[]): void => {
    if (userText.trim().length === 0) {
      return;
    }

    const storeState = useDesignChatStore.getState();
    const designContext = storeState.designContext;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userText,
      attachments,
      timestamp: Date.now(),
      designContext,
    };
    const nextMessages = [...storeState.messages, userMessage];

    const sessionId = ensureSessionId(storeState.currentSessionId);

    if (!storeState.currentSessionId) {
      ph.capture("design_session_started", { ai_model: ANALYTICS_AI_MODEL });
    }

    addMessage(userMessage);
    clearAttachments();

    startGeneration("generating", sessionId);

    if (isTileGenerationMode(storeState)) {
      void submitTileDesignRequest({
        userText,
        attachments,
        messages: nextMessages,
        activeUserMessageId: userMessage.id,
        sessionId,
      });
      return;
    }

    const { baseImageUrl, baseImageWorkId } = getBaseImageContext(storeState);
    const routeResolution = resolveGenerationRoute({
      userMessage: userText,
      hasCiImage:
        !!designContext.sourceImage ||
        !!designContext.ciImage ||
        !!designContext.referenceImage,
      hasReferenceImage: false,
      hasPreviousGeneratedImage: !!baseImageUrl,
      selectedPreviewImageUrl: storeState.selectedPreviewImageUrl,
      detectedPattern: designContext.pattern,
    });
    const editIntent = isEditIntent(routeResolution.signals);

    submitDesignRequest(
      createRequest({
        messages: nextMessages,
        userMessage: userText,
        attachments,
        designContext,
        sessionId,
        executionMode: "auto",
        analysisWorkId: null,
        ...createEditRequestBase(editIntent, baseImageUrl, baseImageWorkId),
      }),
      "죄송합니다. 디자인 생성 중 오류가 발생했습니다. 다시 시도해 주세요.",
      "idle",
    );
  };

  const regenerate = (): void => {
    const storeState = useDesignChatStore.getState();
    const lastUserMessage = storeState.messages.findLast(
      (m) => m.role === "user",
    );

    if (!lastUserMessage) {
      return;
    }

    const sessionId = ensureSessionId(storeState.currentSessionId);
    startGeneration("regenerating", sessionId);

    if (isTileGenerationMode(storeState)) {
      void submitTileDesignRequest({
        userText: lastUserMessage.content,
        attachments: lastUserMessage.attachments ?? [],
        messages: storeState.messages,
        activeUserMessageId: lastUserMessage.id,
        sessionId,
      });
      return;
    }

    const designContext = storeState.designContext;
    const { baseImageUrl, baseImageWorkId } = getBaseImageContext(storeState);
    const routeResolution = resolveGenerationRoute({
      userMessage: lastUserMessage.content,
      hasCiImage:
        !!(lastUserMessage.designContext ?? designContext).sourceImage ||
        !!(lastUserMessage.designContext ?? designContext).ciImage ||
        !!(lastUserMessage.designContext ?? designContext).referenceImage,
      hasReferenceImage: false,
      hasPreviousGeneratedImage: !!baseImageUrl,
      selectedPreviewImageUrl: storeState.selectedPreviewImageUrl,
      detectedPattern: (lastUserMessage.designContext ?? designContext).pattern,
    });
    const editIntent = isEditIntent(routeResolution.signals);

    submitDesignRequest(
      createRequest({
        messages: storeState.messages,
        userMessage: lastUserMessage.content,
        attachments: lastUserMessage.attachments ?? [],
        designContext: lastUserMessage.designContext ?? designContext,
        sessionId,
        executionMode: "auto",
        ...createEditRequestBase(editIntent, baseImageUrl, baseImageWorkId),
      }),
      "죄송합니다. 디자인 재생성 중 오류가 발생했습니다. 다시 시도해 주세요.",
      "completed",
    );
  };

  const requestRender = (): void => {
    const storeState = useDesignChatStore.getState();
    const {
      currentSessionId: storeSessionId,
      lastAnalysisWorkId: currentLastAnalysisWorkId,
      lastEligibleForRender: currentLastEligibleForRender,
      lastAnalysisReuseKey: currentLastAnalysisReuseKey,
    } = storeState;

    if (!currentLastAnalysisWorkId || !currentLastEligibleForRender) {
      return;
    }

    const firstUserMsg = findFirstUserMessage(storeState.messages);

    if (!firstUserMsg) {
      return;
    }

    const sessionId = ensureSessionId(storeSessionId);
    const {
      baseImageUrl: currentBaseImageUrl,
      baseImageWorkId: currentBaseImageWorkId,
    } = getBaseImageContext(storeState);
    const currentReuseKey = createAnalysisReuseKeyForContext(
      storeState.designContext,
      currentBaseImageUrl,
      currentBaseImageWorkId,
    );
    const canReuseAnalysis = currentLastAnalysisReuseKey === currentReuseKey;
    const executionMode = canReuseAnalysis ? "render_from_analysis" : "auto";

    startGeneration("rendering", sessionId, {
      resetAnalysis: !canReuseAnalysis,
    });

    submitDesignRequest(
      createRequest({
        messages: storeState.messages,
        userMessage: firstUserMsg.content,
        attachments: firstUserMsg.attachments ?? [],
        designContext: storeState.designContext,
        sessionId,
        executionMode,
        analysisWorkId: canReuseAnalysis ? currentLastAnalysisWorkId : null,
        ...(currentBaseImageUrl
          ? {
              baseImageUrl: currentBaseImageUrl,
              baseImageWorkId: currentBaseImageWorkId,
            }
          : {}),
      }),
      "죄송합니다. 이미지 렌더링 중 오류가 발생했습니다. 다시 시도해 주세요.",
      "completed",
      {
        skipAiMessageAppend: true,
      },
    );
  };

  const requestInpaint = (
    maskBase64: string,
    editPrompt: string,
  ): InpaintRequestResult => {
    const trimmedMaskBase64 = maskBase64.trim();
    const trimmedPrompt = editPrompt.trim();
    if (trimmedMaskBase64.length === 0 || trimmedPrompt.length === 0) {
      return {
        started: false,
        errorCode: "INVALID_INPUT",
        errorMessage:
          trimmedMaskBase64.length === 0
            ? "수정할 영역을 먼저 칠해 주세요."
            : "수정 지시를 입력해 주세요.",
      };
    }

    const storeState = useDesignChatStore.getState();
    const { imageUrl: targetImageUrl, imageWorkId: targetImageWorkId } =
      getInpaintTarget(storeState);

    if (!targetImageUrl) {
      return {
        started: false,
        errorCode: "NO_EDIT_TARGET",
        errorMessage: INPAINT_TARGET_REQUIRED_MESSAGE,
      };
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedPrompt,
      timestamp: Date.now(),
      designContext: storeState.designContext,
    };
    const nextMessages = [...storeState.messages, userMessage];
    const sessionId = ensureSessionId(storeState.currentSessionId);

    addMessage(userMessage);
    startGeneration("rendering", sessionId);

    submitDesignRequest(
      createRequest({
        messages: nextMessages,
        userMessage: trimmedPrompt,
        attachments: [],
        designContext: storeState.designContext,
        sessionId,
        executionMode: "auto",
        analysisWorkId: null,
        route: "fal_inpaint",
        baseImageUrl: targetImageUrl,
        baseImageWorkId: targetImageWorkId,
        maskBase64: trimmedMaskBase64,
        maskMimeType: "image/png",
        editPrompt: trimmedPrompt,
      }),
      "죄송합니다. 부분 수정 중 오류가 발생했습니다. 다시 시도해 주세요.",
      "completed",
    );

    return { started: true };
  };

  return {
    sendMessage,
    regenerate,
    requestRender,
    requestInpaint,
    isLoading: isActiveGeneration(generationStatus),
  };
}
