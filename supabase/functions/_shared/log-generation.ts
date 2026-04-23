import type { SupabaseClient } from "@supabase/supabase-js";

export type AiGenerationLogPhase = "analysis" | "prep" | "render";
export type AiGenerationLogRequestType =
  | "analysis"
  | "prep"
  | "render_standard"
  | "render_high";
export type AiGenerationLogQuality = "standard" | "high";

export type AiGenerationLogInsert = {
  work_id: string;
  workflow_id: string;
  phase: AiGenerationLogPhase;
  parent_work_id?: string | null;
  user_id: string;
  ai_model: "openai" | "fal";
  request_type: AiGenerationLogRequestType;
  quality?: AiGenerationLogQuality | null;
  user_message: string;
  prompt_length: number;
  request_attachments?: Array<{
    type: "color" | "pattern" | "fabric" | "image" | "ci-placement";
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
  eligible_for_render?: boolean | null;
  missing_requirements?: string[] | null;
  eligibility_reason?: string | null;
  text_prompt?: string | null;
  image_prompt?: string | null;
  image_edit_prompt?: string | null;
  route?:
    | "openai"
    | "fal_tiling"
    | "fal_edit"
    | "fal_controlnet"
    | "fal_inpaint"
    | null;
  route_reason?: string | null;
  route_signals?: string[] | null;
  base_image_work_id?: string | null;
  fal_request_id?: string | null;
  render_backend?:
    | "ip_adapter"
    | "img2img"
    | "nano_banana_edit"
    | "controlnet"
    | "flux_fill"
    | null;
  seed?: number | null;
  image_generated: boolean;
  generated_image_url?: string | null;
  pattern_preparation_backend?: "local" | "openai_repair" | null;
  pattern_repair_prompt_kind?: "all_over_tile" | "one_point_motif" | null;
  pattern_repair_applied?: boolean | null;
  pattern_repair_reason_codes?: string[] | null;
  prep_tokens_charged?: number | null;
  detected_design?: Record<string, unknown> | null;
  tokens_charged?: number;
  tokens_refunded?: number;
  text_latency_ms?: number | null;
  image_latency_ms?: number | null;
  total_latency_ms?: number | null;
  error_type?: string | null;
  error_message?: string | null;
};

export async function logGeneration(
  adminClient: SupabaseClient,
  data: AiGenerationLogInsert,
): Promise<void> {
  try {
    const { error } = await adminClient
      .from("ai_generation_logs")
      .upsert(data, { onConflict: "work_id" });
    if (error) {
      console.error("logGeneration insert error:", error.message);
    }
  } catch (err) {
    console.error("logGeneration unexpected error:", err);
  }
}
