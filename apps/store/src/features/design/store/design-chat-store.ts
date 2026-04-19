import { create } from "zustand";
import type {
  GenerationRoute,
  GenerationRouteReason,
  GenerationRouteSignal,
} from "@/entities/design";
import type {
  AiModel,
  Attachment,
  GenerationStatus,
  Message,
} from "@/features/design/types/chat";
import type { DesignContext } from "@/features/design/types/design-context";
import type { RestoredDesignSessionState } from "@/entities/design";

export const getRawImageUrlFromPreviewBackground = (
  value: string | null | undefined,
): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const match = trimmed.match(/^url\((['"]?)(.*?)\1\)/i);
  if (match?.[2]) {
    return match[2];
  }

  return trimmed;
};

interface DesignChatState {
  messages: Message[];
  designContext: DesignContext;
  generationStatus: GenerationStatus;
  generatedImageUrl: string | null;
  selectedPreviewImageUrl: string | null;
  resultTags: string[];
  pendingAttachments: Attachment[];
  aiModel: AiModel;
  currentSessionId: string | null;
  autoGenerateImage: boolean;
  baseImageUrl: string | null;
  baseImageWorkId: string | null;
  lastRoute: GenerationRoute | null;
  lastRouteSignals: GenerationRouteSignal[];
  lastRouteReason: GenerationRouteReason | null;
  lastFalRequestId: string | null;
  lastSeed: number | null;
  lastAnalysisWorkId: string | null;
  lastEligibleForRender: boolean;
  lastMissingRequirements: string[];
  addMessage: (message: Message) => void;
  setDesignContext: (patch: Partial<DesignContext>) => void;
  addAttachment: (attachment: Attachment) => void;
  removeAttachment: (index: number) => void;
  clearAttachments: () => void;
  setGenerationStatus: (status: GenerationStatus) => void;
  setGeneratedImage: (imageUrl: string | null, tags: string[]) => void;
  setSelectedPreviewImage: (url: string) => void;
  setAutoGenerateImage: (value: boolean) => void;
  setGenerationMetadata: (input: {
    baseImageUrl: string | null;
    baseImageWorkId: string | null;
    lastRoute: GenerationRoute | null;
    lastRouteSignals: GenerationRouteSignal[];
    lastRouteReason: GenerationRouteReason | null;
    lastFalRequestId: string | null;
    lastSeed: number | null;
  }) => void;
  setLastAnalysisResult: (input: {
    analysisWorkId: string | null;
    eligibleForRender: boolean;
    missingRequirements: string[];
  }) => void;
  restoreMessages: (messages: Message[]) => void;
  restoreSessionState: (
    sessionId: string,
    sessionState: RestoredDesignSessionState,
  ) => void;
  resetConversation: () => void;
  setAiModel: (model: AiModel) => void;
  setCurrentSessionId: (id: string) => void;
}

const createInitialDesignContext = (): DesignContext => ({
  colors: [],
  pattern: null,
  fabricMethod: "yarn-dyed",
  ciImage: null,
  ciPlacement: null,
  referenceImage: null,
});

const createLastAnalysisReset = () => ({
  lastAnalysisWorkId: null as string | null,
  lastEligibleForRender: false,
  lastMissingRequirements: [] as string[],
});

const createRouteMetadataReset = () => ({
  lastRoute: null as GenerationRoute | null,
  lastRouteSignals: [] as GenerationRouteSignal[],
  lastRouteReason: null as GenerationRouteReason | null,
  lastFalRequestId: null as string | null,
  lastSeed: null as number | null,
});

const createConversationResetState = () => ({
  messages: [],
  designContext: createInitialDesignContext(),
  generationStatus: "idle" as GenerationStatus,
  generatedImageUrl: null as string | null,
  selectedPreviewImageUrl: null as string | null,
  resultTags: [] as string[],
  pendingAttachments: [] as Attachment[],
  currentSessionId: null as string | null,
  baseImageUrl: null as string | null,
  baseImageWorkId: null as string | null,
  ...createRouteMetadataReset(),
  ...createLastAnalysisReset(),
});

export const useDesignChatStore = create<DesignChatState>((set) => ({
  ...createConversationResetState(),
  aiModel: "openai",
  autoGenerateImage: true,
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  setDesignContext: (patch) =>
    set((state) => ({
      designContext: {
        ...state.designContext,
        ...patch,
      },
    })),
  addAttachment: (attachment) =>
    set((state) => ({
      pendingAttachments: [...state.pendingAttachments, attachment],
    })),
  removeAttachment: (index) =>
    set((state) => ({
      pendingAttachments: state.pendingAttachments.filter(
        (_, attachmentIndex) => attachmentIndex !== index,
      ),
    })),
  clearAttachments: () =>
    set({
      pendingAttachments: [],
    }),
  setGenerationStatus: (status) =>
    set({
      generationStatus: status,
    }),
  setGeneratedImage: (imageUrl, tags) =>
    set(
      imageUrl !== null
        ? {
            generatedImageUrl: imageUrl,
            selectedPreviewImageUrl: imageUrl,
            resultTags: tags,
          }
        : {
            generatedImageUrl: null,
            selectedPreviewImageUrl: null,
            resultTags: [],
          },
    ),
  setSelectedPreviewImage: (url) => set({ selectedPreviewImageUrl: url }),
  setAutoGenerateImage: (value) => set({ autoGenerateImage: value }),
  setGenerationMetadata: (input) =>
    set({
      baseImageUrl: input.baseImageUrl,
      baseImageWorkId: input.baseImageWorkId,
      lastRoute: input.lastRoute,
      lastRouteSignals: input.lastRouteSignals,
      lastRouteReason: input.lastRouteReason,
      lastFalRequestId: input.lastFalRequestId,
      lastSeed: input.lastSeed,
    }),
  setLastAnalysisResult: (input) =>
    set({
      lastAnalysisWorkId: input.analysisWorkId,
      lastEligibleForRender: input.eligibleForRender,
      lastMissingRequirements: input.missingRequirements,
    }),
  resetConversation: () => set(createConversationResetState()),
  restoreMessages: (messages) => set({ messages }),
  restoreSessionState: (sessionId, sessionState) =>
    set({
      ...sessionState,
      selectedPreviewImageUrl: sessionState.generatedImageUrl,
      baseImageUrl: getRawImageUrlFromPreviewBackground(
        sessionState.generatedImageUrl,
      ),
      baseImageWorkId: sessionState.baseImageWorkId,
      currentSessionId: sessionId,
      pendingAttachments: [],
      ...createRouteMetadataReset(),
      ...createLastAnalysisReset(),
    }),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  setAiModel: (model) =>
    set((state) => {
      if (state.aiModel === model) return {};
      if (state.generationStatus !== "idle") return {};
      return {
        aiModel: model,
        ...createConversationResetState(),
      };
    }),
}));
