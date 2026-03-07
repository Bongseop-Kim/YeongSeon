import { create } from "zustand";
import type {
  Attachment,
  Conversation,
  GenerationStatus,
  Message,
} from "@/features/design/types/chat";
import type { DesignContext } from "@/features/design/types/design-context";

export interface DesignChatState {
  messages: Message[];
  conversationId: string;
  designContext: DesignContext;
  generationStatus: GenerationStatus;
  generatedImageUrl: string | null;
  resultTags: string[];
  pendingAttachments: Attachment[];
  addMessage: (message: Message) => void;
  setDesignContext: (patch: Partial<DesignContext>) => void;
  addAttachment: (attachment: Attachment) => void;
  removeAttachment: (index: number) => void;
  clearAttachments: () => void;
  setGenerationStatus: (status: GenerationStatus) => void;
  setGeneratedImage: (imageUrl: string, tags: string[]) => void;
  resetConversation: () => void;
  loadConversation: (conversation: Conversation) => void;
}

export const createInitialDesignContext = (): DesignContext => ({
  colors: [],
  pattern: null,
  fabricMethod: null,
  ciImage: null,
  referenceImage: null,
});

export const useDesignChatStore = create<DesignChatState>((set) => ({
  messages: [],
  conversationId: crypto.randomUUID(),
  designContext: createInitialDesignContext(),
  generationStatus: "idle",
  generatedImageUrl: null,
  resultTags: [],
  pendingAttachments: [],
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
    set({
      generatedImageUrl: imageUrl,
      resultTags: tags,
    }),
  resetConversation: () =>
    set({
      messages: [],
      conversationId: crypto.randomUUID(),
      designContext: createInitialDesignContext(),
      generationStatus: "idle",
      generatedImageUrl: null,
      resultTags: [],
      pendingAttachments: [],
    }),
  loadConversation: (conversation) => {
    const lastAiMessage = [...conversation.messages].reverse().find(
      (m) => m.role === "ai" && m.imageUrl,
    );
    set({
      messages: conversation.messages,
      conversationId: conversation.id,
      generatedImageUrl: lastAiMessage?.imageUrl ?? null,
      generationStatus: lastAiMessage?.imageUrl ? "completed" : "idle",
      resultTags: [],
      pendingAttachments: [],
    });
  },
}));
