import { useQueryClient } from "@tanstack/react-query";
import {
  DESIGN_TOKEN_BALANCE_QUERY_KEY,
  isActiveGeneration,
  InsufficientTokensError,
  callTileGeneration,
  type TileGenerationPayload,
  fabricMethodToFabricType,
  uploadDesignAsset,
} from "@/entities/design";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import { DESIGN_SESSIONS_QUERY_KEY } from "@/features/design/hooks/design-session-query";
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
  isLoading: boolean;
}

const ANALYTICS_AI_MODEL = "openai" as const;
const TILE_GENERATION_SUCCESS_MESSAGE = "타일 기반 디자인을 생성했습니다.";

const filterVisibleMessages = (items: Message[]): Message[] =>
  items.filter((m) => !m.uiOnly && m.content.trim().length > 0);

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

const withResolvedImageAttachmentUrls = (
  allMessages: ReturnType<typeof toSessionPayload>["allMessages"],
  messageId: string,
  resolvedImageUrls: Array<string | null>,
): ReturnType<typeof toSessionPayload>["allMessages"] => {
  if (resolvedImageUrls.length === 0) {
    return allMessages;
  }

  const index = allMessages.findIndex((m) => m.id === messageId);
  if (index === -1) return allMessages;

  const message = allMessages[index];
  const updated = [...allMessages];
  let imageIndex = 0;
  updated[index] = {
    ...message,
    imageUrl: resolvedImageUrls.find((url) => url !== null) ?? message.imageUrl,
    attachments: message.attachments?.map((attachment) => {
      if (attachment.type !== "image") {
        return attachment;
      }

      const resolvedUrl = resolvedImageUrls[imageIndex++];
      return resolvedUrl ? { ...attachment, value: resolvedUrl } : attachment;
    }),
  };
  return updated;
};

const resolveAttachedImageUrls = async (
  attachments: Attachment[],
  sessionId: string,
): Promise<Array<string | null>> => {
  const imageAttachments = attachments.filter((a) => a.type === "image");

  return Promise.all(
    imageAttachments.map(async (attachment) => {
      if (attachment.file) {
        const uploaded = await uploadDesignAsset(attachment.file, {
          kind: "reference",
          sessionId,
        });
        return uploaded.url;
      }

      if (attachment.value.startsWith("https://")) {
        return attachment.value;
      }

      console.warn("[resolveAttachedImageUrls] Rejected non-HTTPS image URL", {
        fileName: attachment.fileName,
        type: attachment.type,
        value: attachment.value,
      });
      return null;
    }),
  );
};

const toApiConversationHistory = (
  items: Message[],
): Array<{ role: "user" | "assistant"; content: string }> =>
  filterVisibleMessages(items).map((m) => ({
    role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

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
  const clearAttachments = useDesignChatStore(
    (state) => state.clearAttachments,
  );
  const setTileResult = useDesignChatStore((state) => state.setTileResult);
  const setCurrentSessionId = useDesignChatStore(
    (state) => state.setCurrentSessionId,
  );

  const ensureSessionId = (currentSessionId: string | null): string => {
    const sessionId = currentSessionId ?? crypto.randomUUID();

    if (!currentSessionId) {
      setCurrentSessionId(sessionId);
    }

    return sessionId;
  };

  const startGeneration = (
    status: "generating" | "regenerating",
    sessionId: string,
  ): void => {
    setGenerationStatus(status);
    onGenerationStart?.(sessionId);
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

  const submitTileDesignRequest = async (input: {
    userText: string;
    attachments: Attachment[];
    messages: Message[];
    activeUserMessageId: string;
    sessionId: string;
    failureStatus?: "idle" | "completed";
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
      const attachedImageUrls = await resolveAttachedImageUrls(
        input.attachments,
        input.sessionId,
      );
      const sessionMessages = withResolvedImageAttachmentUrls(
        allMessages,
        input.activeUserMessageId,
        attachedImageUrls,
      );
      const uiFabricType = fabricMethodToFabricType(
        state.designContext.fabricMethod,
      );
      const result = await callTileGeneration({
        route,
        userMessage: input.userText,
        uiFabricType,
        selectedColors: state.designContext.colors,
        previousFabricType: state.fabricType,
        previousRepeatTile: state.repeatTile,
        previousAccentTile: state.accentTile,
        previousAccentLayoutJson: state.accentLayout,
        conversationHistory: toApiConversationHistory(priorMessages),
        attachedImageUrls: attachedImageUrls.filter(
          (url): url is string => url !== null,
        ),
        sessionId: input.sessionId,
        workflowId: crypto.randomUUID(),
        firstMessage: firstUserMsg?.content ?? input.userText,
        allMessages: sessionMessages,
      });

      setTileResult({
        repeatTile: result.repeatTile,
        accentTile: result.accentTile,
        accentLayout: result.accentLayout,
        patternType: result.patternType,
        fabricType: result.fabricType,
      });
      setGeneratedImage(toPreviewBackground(result.repeatTile.url), []);
      addMessage({
        id: crypto.randomUUID(),
        role: "ai",
        content: TILE_GENERATION_SUCCESS_MESSAGE,
        imageUrl: result.repeatTile.url,
        ...(result.accentTile
          ? {
              accentTileUrl: result.accentTile.url,
              accentTileWorkId: result.accentTile.workId,
            }
          : {}),
        workId: result.repeatTile.workId,
        timestamp: Date.now(),
      });
      setGenerationStatus("completed");
      onGenerationEnd?.();

      void queryClient.invalidateQueries({
        queryKey: DESIGN_TOKEN_BALANCE_QUERY_KEY,
      });
      void queryClient.invalidateQueries({
        queryKey: DESIGN_SESSIONS_QUERY_KEY,
      });
    } catch (error) {
      console.error("tile generation failed:", error);
      finalizeGenerationFailure(
        toInsufficientTokensMessage(
          error,
          "죄송합니다. 타일 기반 디자인 생성 중 오류가 발생했습니다. 다시 시도해 주세요.",
        ),
        error instanceof InsufficientTokensError ? "idle" : input.failureStatus,
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

    void submitTileDesignRequest({
      userText,
      attachments,
      messages: nextMessages,
      activeUserMessageId: userMessage.id,
      sessionId,
    });
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

    void submitTileDesignRequest({
      userText: lastUserMessage.content,
      attachments: lastUserMessage.attachments ?? [],
      messages: storeState.messages,
      activeUserMessageId: lastUserMessage.id,
      sessionId,
      failureStatus: "completed",
    });
  };

  return {
    sendMessage,
    regenerate,
    isLoading: isActiveGeneration(generationStatus),
  };
}
