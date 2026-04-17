import { create } from "zustand";
import type {
  AiModel,
  Attachment,
  GenerationStatus,
  Message,
} from "@/features/design/types/chat";
import type { DesignContext } from "@/features/design/types/design-context";
import type { RestoredDesignSessionState } from "@/entities/design";

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

const LAST_ANALYSIS_RESET = {
  lastAnalysisWorkId: null as string | null,
  lastEligibleForRender: false,
  lastMissingRequirements: [] as string[],
};

export const useDesignChatStore = create<DesignChatState>((set) => ({
  messages: [],
  designContext: createInitialDesignContext(),
  generationStatus: "idle",
  generatedImageUrl: null,
  selectedPreviewImageUrl: null,
  resultTags: [],
  pendingAttachments: [],
  aiModel: "openai",
  currentSessionId: null,
  autoGenerateImage: true,
  ...LAST_ANALYSIS_RESET,
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
  setLastAnalysisResult: (input) =>
    set({
      lastAnalysisWorkId: input.analysisWorkId,
      lastEligibleForRender: input.eligibleForRender,
      lastMissingRequirements: input.missingRequirements,
    }),
  resetConversation: () =>
    set({
      messages: [],
      designContext: createInitialDesignContext(),
      generationStatus: "idle",
      generatedImageUrl: null,
      selectedPreviewImageUrl: null,
      resultTags: [],
      pendingAttachments: [],
      currentSessionId: null,
      ...LAST_ANALYSIS_RESET,
    }),
  restoreMessages: (messages) => set({ messages }),
  restoreSessionState: (sessionId, sessionState) =>
    set({
      ...sessionState,
      selectedPreviewImageUrl: sessionState.generatedImageUrl,
      currentSessionId: sessionId,
      pendingAttachments: [],
      ...LAST_ANALYSIS_RESET,
    }),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  setAiModel: (model) =>
    set((state) => {
      if (state.aiModel === model) return {};
      if (state.generationStatus !== "idle") return {};
      return {
        aiModel: model,
        messages: [],
        generationStatus: "idle",
        generatedImageUrl: null,
        selectedPreviewImageUrl: null,
        resultTags: [],
        pendingAttachments: [],
        currentSessionId: null,
        ...LAST_ANALYSIS_RESET,
      };
    }),
}));
