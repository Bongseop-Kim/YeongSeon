import { supabase } from "@/shared/lib/supabase";
import { InsufficientTokensError } from "@/entities/design/model/design-errors";
import { parseEdgeErrorResponse } from "@/entities/design/api/providers/parse-edge-error";
import type {
  TileGenerationPayload,
  TileGenerationResult,
} from "@/entities/design/model/tile-types";

export async function callTileGeneration(
  payload: TileGenerationPayload,
): Promise<TileGenerationResult> {
  const { data, error } = await supabase.functions.invoke("generate-tile", {
    body: payload,
  });

  if (error) {
    const body = (await parseEdgeErrorResponse(error)) as {
      error?: string;
      balance?: number;
      cost?: number;
    } | null;

    if (body?.error === "insufficient_tokens") {
      throw new InsufficientTokensError(body.balance ?? 0, body.cost ?? 0);
    }

    throw error;
  }
  return data as TileGenerationResult;
}
