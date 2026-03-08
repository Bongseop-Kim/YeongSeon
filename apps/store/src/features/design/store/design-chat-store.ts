import { create } from "zustand";
import type {
  AiModel,
  Attachment,
  GenerationStatus,
  Message,
} from "@/features/design/types/chat";
import type { DesignContext } from "@/features/design/types/design-context";

export interface DesignChatState {
  messages: Message[];
  designContext: DesignContext;
  generationStatus: GenerationStatus;
  generatedImageUrl: string | null;
  isImageDownloaded: boolean;
  resultTags: string[];
  pendingAttachments: Attachment[];
  aiModel: AiModel;
  addMessage: (message: Message) => void;
  setDesignContext: (patch: Partial<DesignContext>) => void;
  addAttachment: (attachment: Attachment) => void;
  removeAttachment: (index: number) => void;
  clearAttachments: () => void;
  setGenerationStatus: (status: GenerationStatus) => void;
  setGeneratedImage: (imageUrl: string | null, tags: string[]) => void;
  markImageDownloaded: () => void;
  resetConversation: () => void;
  setAiModel: (model: AiModel) => void;
}

export const createInitialDesignContext = (): DesignContext => ({
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
        ? { generatedImageUrl: imageUrl, isImageDownloaded: false, resultTags: tags }
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
    }),
  setAiModel: (model) =>
    set((state) => {
      if (state.aiModel === model) return {};
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
