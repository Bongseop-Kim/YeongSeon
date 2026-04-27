import type {
  GenerationRequestType,
  UseDesignTokensResult,
} from "@/functions/_shared/design-generation.ts";

const TILE_AI_MODEL = "openai";
export const TILE_RENDER_REQUEST_TYPE =
  "render_standard" as const satisfies GenerationRequestType;

type TokenRpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

export const chargeTileRenderTokens = async (
  adminClient: TokenRpcClient,
  params: {
    userId: string;
    workId: string;
  },
) => {
  const { data, error } = await adminClient.rpc("use_design_tokens", {
    p_user_id: params.userId,
    p_ai_model: TILE_AI_MODEL,
    p_request_type: TILE_RENDER_REQUEST_TYPE,
    p_work_id: params.workId,
  });

  return {
    data: data as UseDesignTokensResult | null,
    error,
  };
};

export const refundTileRenderTokens = async (
  adminClient: TokenRpcClient,
  params: {
    userId: string;
    amount: number;
    workId: string;
  },
): Promise<"skipped" | "succeeded" | "failed"> => {
  if (params.amount <= 0) {
    return "skipped";
  }

  const { error } = await adminClient.rpc("refund_design_tokens", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_ai_model: TILE_AI_MODEL,
    p_request_type: TILE_RENDER_REQUEST_TYPE,
    p_work_id: params.workId,
  });

  if (error) {
    console.error("Tile token refund failed:", error);
    return "failed";
  }

  return "succeeded";
};
