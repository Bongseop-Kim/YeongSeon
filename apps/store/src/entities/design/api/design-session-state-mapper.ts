import type { DesignSessionMessage } from "@/entities/design/model/design-session";
import type { GenerationStatus, Message } from "@/features/design/types/chat";
import { toPreviewBackground } from "@/features/design/utils";

export interface RestoredDesignSessionState {
  messages: Message[];
  generatedImageUrl: string | null;
  resultTags: string[];
  generationStatus: GenerationStatus;
}

function sessionMessageToMessage(message: DesignSessionMessage): Message {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    imageUrl: message.imageUrl
      ? toPreviewBackground(message.imageUrl)
      : undefined,
    rawImageUrl: message.imageUrl ?? undefined,
    timestamp: new Date(message.createdAt).getTime(),
  };
}

export function toRestoredDesignSessionState(
  messages: DesignSessionMessage[],
): RestoredDesignSessionState {
  const restoredMessages = messages.map(sessionMessageToMessage);

  let lastImageMessage: DesignSessionMessage | undefined;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const candidate = messages[index];
    if (candidate.imageUrl) {
      lastImageMessage = candidate;
      break;
    }
  }

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
