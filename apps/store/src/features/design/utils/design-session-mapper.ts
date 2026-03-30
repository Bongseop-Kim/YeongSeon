import type { DesignSessionMessage } from "@/entities/design";
import type { GenerationStatus, Message } from "@/features/design/types/chat";
import { toPreviewBackground } from "@/features/design/utils";

export interface RestoredDesignSessionState {
  messages: Message[];
  generatedImageUrl: string | null;
  resultTags: string[];
  generationStatus: GenerationStatus;
}

function sessionMessageToMessage(m: DesignSessionMessage): Message {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    imageUrl: m.imageUrl ? toPreviewBackground(m.imageUrl) : undefined,
    rawImageUrl: m.imageUrl ?? undefined,
    timestamp: new Date(m.createdAt).getTime(),
  };
}

export function toRestoredDesignSessionState(
  messages: DesignSessionMessage[],
): RestoredDesignSessionState {
  const restoredMessages = messages.map(sessionMessageToMessage);
  const lastImageMessage = [...messages]
    .reverse()
    .find((message) => message.imageUrl);
  const generatedImageUrl = lastImageMessage?.imageUrl
    ? toPreviewBackground(lastImageMessage.imageUrl)
    : null;

  return {
    messages: restoredMessages,
    generatedImageUrl,
    resultTags: [],
    generationStatus: generatedImageUrl ? "completed" : "idle",
  };
}
