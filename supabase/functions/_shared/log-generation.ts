import type { SupabaseClient } from "@supabase/supabase-js";
import type { AttachmentType } from "./request-attachments.ts";

export type AiGenerationLogPhase = "render";
export type AiGenerationLogRequestType = "render_standard";
export type AiGenerationLogQuality = "standard";

export type AiGenerationLogInsert = {
  work_id: string;
  workflow_id: string;
  phase: AiGenerationLogPhase;
  parent_work_id?: string | null;
  user_id: string;
  ai_model: "openai";
  request_type: AiGenerationLogRequestType;
  quality?: AiGenerationLogQuality | null;
  user_message: string;
  prompt_length: number;
  request_attachments?: Array<{
    type: AttachmentType;
    label: string;
    value: string;
    fileName?: string;
  }> | null;
  design_context?: Record<string, unknown> | null;
  normalized_design?: Record<string, unknown> | null;
  conversation_turn?: number;
  has_ci_image?: boolean;
  has_reference_image?: boolean;
  has_previous_image?: boolean;
  ai_message?: string | null;
  generate_image?: boolean | null;
  image_prompt?: string | null;
  route?: "openai" | "tile_generation" | "tile_edit" | null;
  image_generated: boolean;
  generated_image_url?: string | null;
  detected_design?: Record<string, unknown> | null;
  tokens_charged?: number;
  tokens_refunded?: number;
  text_latency_ms?: number | null;
  image_latency_ms?: number | null;
  total_latency_ms?: number | null;
  error_type?: string | null;
  error_message?: string | null;
  repeat_tile_url?: string | null;
  repeat_tile_work_id?: string | null;
  accent_tile_url?: string | null;
  accent_tile_work_id?: string | null;
  pattern_type?: "all_over" | "one_point" | null;
  fabric_type?: "yarn_dyed" | "printed" | null;
  tile_role?: "repeat" | "accent" | null;
  paired_tile_work_id?: string | null;
  accent_layout_json?: Record<string, unknown> | null;
};

export interface LogGenerationOptions {
  requireSuccess?: boolean;
}

// `undefined`는 키를 제외해 기존 값을 유지하고, `null`은 컬럼을 비우는 의도로 보존한다.
export async function logGeneration(
  adminClient: SupabaseClient,
  data: AiGenerationLogInsert,
  options: LogGenerationOptions = {},
): Promise<void> {
  try {
    const { error } = await adminClient
      .from("ai_generation_logs")
      .upsert(
        Object.fromEntries(
          Object.entries(data).filter(([, value]) => value !== undefined),
        ),
        { onConflict: "work_id" },
      );
    if (error) {
      const message = `logGeneration upsert error: ${error.message}`;
      console.error(message, error);
      if (options.requireSuccess) {
        throw new Error(message);
      }
    }
  } catch (err) {
    if (options.requireSuccess) {
      throw err;
    }
    console.error("logGeneration unexpected error:", err);
  }
}
