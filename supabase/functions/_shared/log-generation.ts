import type { SupabaseClient } from "@supabase/supabase-js";

export type AiGenerationLogInsert = {
  work_id: string;
  user_id: string;
  ai_model: "openai" | "gemini";
  request_type: "text_only" | "text_and_image" | null;
  quality?: "standard" | "high" | null;
  user_message: string;
  prompt_length: number;
  design_context?: Record<string, unknown> | null;
  conversation_turn: number;
  has_ci_image: boolean;
  has_reference_image: boolean;
  has_previous_image: boolean;
  ai_message?: string | null;
  generate_image?: boolean | null;
  image_generated: boolean;
  detected_design?: Record<string, unknown> | null;
  tokens_charged: number;
  tokens_refunded: number;
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
    const { error } = await adminClient.from("ai_generation_logs").insert(data);
    if (error) {
      console.error("logGeneration insert error:", error.message);
    }
  } catch (err) {
    console.error("logGeneration unexpected error:", err);
  }
}
