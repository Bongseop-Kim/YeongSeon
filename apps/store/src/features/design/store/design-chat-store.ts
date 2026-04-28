import { create } from "zustand";
import type {
  AccentLayout,
  FabricType,
  PatternType,
  TileRef,
} from "@/entities/design";
import type {
  Attachment,
  GenerationStatus,
  Message,
} from "@/features/design/types/chat";
import type { DesignContext } from "@/features/design/types/design-context";
import type { RestoredDesignSessionState } from "@/entities/design";

type PreviewTileRef = {
  url: string;
  workId: string | null;
};

interface SelectedTilePreview {
  previewBackground: string;
  repeatTile: PreviewTileRef;
  accentTile: PreviewTileRef | null;
  patternType: PatternType;
}

interface DesignChatState {
  messages: Message[];
  designContext: DesignContext;
  generationStatus: GenerationStatus;
  generatedImageUrl: string | null;
  selectedPreviewImageUrl: string | null;
  selectedTilePreview: SelectedTilePreview | null;
  resultTags: string[];
  pendingAttachments: Attachment[];
  currentSessionId: string | null;
  repeatTile: TileRef | null;
  accentTile: TileRef | null;
  accentLayout: AccentLayout | null;
  patternType: PatternType | null;
  fabricType: FabricType | null;
  addMessage: (message: Message) => void;
  setDesignContext: (patch: Partial<DesignContext>) => void;
  addAttachment: (attachment: Attachment) => void;
  removeAttachment: (index: number) => void;
  clearAttachments: () => void;
  setGenerationStatus: (status: GenerationStatus) => void;
  setGeneratedImage: (imageUrl: string | null, tags: string[]) => void;
  setSelectedPreviewImage: (url: string) => void;
  setSelectedTilePreview: (preview: SelectedTilePreview) => void;
  setTileResult: (result: {
    repeatTile: TileRef;
    accentTile: TileRef | null;
    accentLayout: AccentLayout | null;
    patternType: PatternType;
    fabricType: FabricType;
  }) => void;
  restoreMessages: (messages: Message[]) => void;
  restoreSessionState: (
    sessionId: string,
    sessionState: RestoredDesignSessionState,
  ) => void;
  resetConversation: () => void;
  setCurrentSessionId: (id: string) => void;
}

const createInitialDesignContext = (): DesignContext => ({
  colors: [],
  pattern: null,
  fabricMethod: "yarn-dyed",
  sourceImage: null,
  onePointOffsetX: 0,
  onePointOffsetY: 0,
  ciImage: null,
  ciPlacement: null,
  referenceImage: null,
});

const createConversationResetState = () => ({
  messages: [],
  designContext: createInitialDesignContext(),
  generationStatus: "idle" as GenerationStatus,
  generatedImageUrl: null as string | null,
  selectedPreviewImageUrl: null as string | null,
  selectedTilePreview: null as SelectedTilePreview | null,
  resultTags: [] as string[],
  pendingAttachments: [] as Attachment[],
  currentSessionId: null as string | null,
  repeatTile: null as TileRef | null,
  accentTile: null as TileRef | null,
  accentLayout: null as AccentLayout | null,
  patternType: null as PatternType | null,
  fabricType: null as FabricType | null,
});

export const useDesignChatStore = create<DesignChatState>((set) => ({
  ...createConversationResetState(),
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
    set((state) =>
      state.pendingAttachments.length === 0
        ? state
        : { pendingAttachments: [] },
    ),
  setGenerationStatus: (status) =>
    set((state) =>
      state.generationStatus === status ? state : { generationStatus: status },
    ),
  setGeneratedImage: (imageUrl, tags) =>
    set(
      imageUrl !== null
        ? {
            generatedImageUrl: imageUrl,
            selectedPreviewImageUrl: imageUrl,
            selectedTilePreview: null,
            resultTags: tags,
          }
        : {
            generatedImageUrl: null,
            selectedPreviewImageUrl: null,
            selectedTilePreview: null,
            resultTags: [],
          },
    ),
  setSelectedPreviewImage: (url) =>
    set((state) =>
      state.selectedPreviewImageUrl === url
        ? state
        : { selectedPreviewImageUrl: url, selectedTilePreview: null },
    ),
  setSelectedTilePreview: (preview) =>
    set({
      selectedPreviewImageUrl: preview.previewBackground,
      selectedTilePreview: preview,
    }),
  setTileResult: (result) =>
    set({
      repeatTile: result.repeatTile,
      accentTile: result.accentTile,
      accentLayout: result.accentLayout,
      patternType: result.patternType,
      fabricType: result.fabricType,
      selectedTilePreview: null,
    }),
  resetConversation: () => set(createConversationResetState()),
  restoreMessages: (messages) => set({ messages }),
  restoreSessionState: (sessionId, sessionState) =>
    set({
      ...sessionState,
      designContext: {
        ...createInitialDesignContext(),
        ...sessionState.designContext,
      },
      selectedPreviewImageUrl: sessionState.generatedImageUrl,
      selectedTilePreview: null,
      currentSessionId: sessionId,
      pendingAttachments: [],
    }),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
}));
