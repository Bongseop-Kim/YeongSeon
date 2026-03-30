import type { ContextChip } from "@/entities/design/model/ai-design-types";

export interface AiDesignResponse {
  aiMessage: string;
  imageUrl: string | null;
  tags: string[];
  contextChips: ContextChip[];
  remainingTokens?: number;
}
