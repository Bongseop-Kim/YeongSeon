export type ConversationTurn = {
  role: "user" | "ai";
  content: string;
};

export type DetectedDesign = {
  pattern: string | null;
  colors: string[];
  ciPlacement: string | null;
  scale: "large" | "medium" | "small" | null;
};

export const MAX_TURN_CONTENT_LENGTH = 10_000;

export const filterValidConversationTurns = (
  conversationHistory?: ConversationTurn[],
): ConversationTurn[] =>
  (conversationHistory ?? []).filter(
    (turn): turn is ConversationTurn =>
      (turn.role === "user" || turn.role === "ai") &&
      typeof turn.content === "string" &&
      turn.content.trim().length > 0 &&
      turn.content.length <= MAX_TURN_CONTENT_LENGTH,
  );
