import { create } from "zustand";
import type {
  AiModel,
  Attachment,
  GenerationStatus,
  Message,
} from "@/features/design/types/chat";
import type { RestoredDesignSessionState } from "@/features/design/utils/design-session-mapper";
import type { DesignContext } from "@/features/design/types/design-context";

interface DesignChatState {
  messages: Message[];
  designContext: DesignContext;
  generationStatus: GenerationStatus;
  generatedImageUrl: string | null;
  isImageDownloaded: boolean;
  resultTags: string[];
  pendingAttachments: Attachment[];
  aiModel: AiModel;
  currentSessionId: string | null;
  addMessage: (message: Message) => void;
  setDesignContext: (patch: Partial<DesignContext>) => void;
  addAttachment: (attachment: Attachment) => void;
  removeAttachment: (index: number) => void;
  clearAttachments: () => void;
  setGenerationStatus: (status: GenerationStatus) => void;
  setGeneratedImage: (imageUrl: string | null, tags: string[]) => void;
  markImageDownloaded: () => void;
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

export const useDesignChatStore = create<DesignChatState>((set) => ({
  messages: [],
  designContext: createInitialDesignContext(),
  generationStatus: "idle",
  generatedImageUrl: null,
  isImageDownloaded: false,
  resultTags: [],
  pendingAttachments: [],
  aiModel: "openai",
  currentSessionId: null,
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
            isImageDownloaded: false,
            resultTags: tags,
          }
        : { generatedImageUrl: null, resultTags: [] },
    ),
  markImageDownloaded: () =>
    set({
      isImageDownloaded: true,
    }),
  resetConversation: () =>
    set({
      messages: [],
      designContext: createInitialDesignContext(),
      generationStatus: "idle",
      generatedImageUrl: null,
      isImageDownloaded: false,
      resultTags: [],
      pendingAttachments: [],
      currentSessionId: null,
    }),
  restoreMessages: (messages) => set({ messages }),
  restoreSessionState: (sessionId, sessionState) =>
    set({
      ...sessionState,
      currentSessionId: sessionId,
      isImageDownloaded: false,
      pendingAttachments: [],
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
        resultTags: [],
        pendingAttachments: [],
      };
    }),
}));
