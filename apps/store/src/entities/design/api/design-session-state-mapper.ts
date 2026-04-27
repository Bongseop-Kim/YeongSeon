import type { DesignSessionMessage } from "@/entities/design/model/design-session";
import type { DesignContext } from "@/entities/design/model/design-context";
import type { GenerationStatus, Message } from "@/entities/design/model/chat";
import type {
  AccentLayout,
  FabricType,
  PatternType,
  TileRef,
} from "@/entities/design/model/tile-types";
import { toPreviewBackground } from "@/shared/lib/to-preview-background";
import { createGuard } from "@/shared/lib/type-guard";

const PATTERN_OPTIONS = [
  "stripe",
  "dot",
  "check",
  "paisley",
  "plain",
  "houndstooth",
  "floral",
] as const satisfies ReadonlyArray<NonNullable<DesignContext["pattern"]>>;
const FABRIC_METHODS = ["yarn-dyed", "print"] as const satisfies ReadonlyArray<
  NonNullable<DesignContext["fabricMethod"]>
>;
const CI_PLACEMENTS = [
  "all-over",
  "one-point",
] as const satisfies ReadonlyArray<NonNullable<DesignContext["ciPlacement"]>>;

const isPatternOption = createGuard<NonNullable<DesignContext["pattern"]>>(
  new Set(PATTERN_OPTIONS),
);
const isFabricMethod = createGuard<NonNullable<DesignContext["fabricMethod"]>>(
  new Set(FABRIC_METHODS),
);
const isCiPlacement = createGuard<NonNullable<DesignContext["ciPlacement"]>>(
  new Set(CI_PLACEMENTS),
);

export interface RestoredDesignSessionState {
  messages: Message[];
  designContext?: Partial<DesignContext>;
  generatedImageUrl: string | null;
  baseImageWorkId: string | null;
  resultTags: string[];
  generationStatus: GenerationStatus;
  repeatTile: TileRef | null;
  accentTile: TileRef | null;
  accentLayout: AccentLayout | null;
  patternType: PatternType | null;
  fabricType: FabricType | null;
}

function sessionMessageToMessage(message: DesignSessionMessage): Message {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    ...(message.imageUrl != null ? { imageUrl: message.imageUrl } : {}),
    ...(message.imageFileId != null
      ? { imageFileId: message.imageFileId }
      : {}),
    ...(message.attachments != null
      ? { attachments: message.attachments }
      : {}),
    timestamp: new Date(message.createdAt).getTime(),
  };
}

function restoreDesignContextFromMessages(
  messages: DesignSessionMessage[],
): Partial<DesignContext> | undefined {
  const restored: Partial<DesignContext> = {};

  for (const message of messages) {
    if (message.role !== "user" || message.attachments == null) {
      continue;
    }

    for (const attachment of message.attachments) {
      if (attachment.type === "color") {
        restored.colors = [
          ...new Set([...(restored.colors ?? []), attachment.value]),
        ];
        continue;
      }

      if (attachment.type === "pattern" && isPatternOption(attachment.value)) {
        restored.pattern = attachment.value;
        continue;
      }

      if (attachment.type === "fabric" && isFabricMethod(attachment.value)) {
        restored.fabricMethod = attachment.value;
        continue;
      }

      if (
        attachment.type === "ci-placement" &&
        isCiPlacement(attachment.value)
      ) {
        restored.ciPlacement = attachment.value;
      }
    }
  }

  return Object.keys(restored).length > 0 ? restored : undefined;
}

export function toRestoredDesignSessionState(
  messages: DesignSessionMessage[],
): RestoredDesignSessionState {
  const restoredMessages = messages.map(sessionMessageToMessage);
  const designContext = restoreDesignContextFromMessages(messages);

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
    ...(designContext ? { designContext } : {}),
    generatedImageUrl,
    baseImageWorkId: null,
    resultTags: [],
    generationStatus: generatedImageUrl ? "completed" : "idle",
    // Tile metadata is merged from the session row in use-session-restore.ts.
    repeatTile: null,
    accentTile: null,
    accentLayout: null,
    patternType: null,
    fabricType: null,
  };
}
