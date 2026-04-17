import type { ContextChip } from "@/entities/design/model/ai-design-types";

export interface AiDesignResponse {
  aiMessage: string;
  imageUrl: string | null;
  workId?: string;
  workflowId?: string;
  analysisWorkId?: string;
  generateImage?: boolean;
  eligibleForRender?: boolean;
  missingRequirements?: string[];
  tags: string[];
  contextChips: ContextChip[];
  remainingTokens?: number;
}
