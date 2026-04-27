export type GenerationRequestType = "render_standard";

export type UseDesignTokensResult = {
  success: boolean;
  error?: string;
  balance: number;
  cost: number;
};
