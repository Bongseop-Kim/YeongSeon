import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestSessionMessage } from "@/functions/_shared/design-request.ts";

export interface SessionMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  image_url: string | null;
  image_file_id: string | null;
  sequence_number: number;
}

export interface SessionSaveParams {
  sessionId: string;
  aiModel: "openai" | "gemini" | "fal";
  firstMessage: string;
  lastImageUrl: string | null;
  lastImageFileId: string | null;
  messages: SessionMessage[];
}

export function buildSessionMessages(
  requestMessages: RequestSessionMessage[],
  newAiMessage: SessionMessage,
): SessionMessage[] {
  return [
    ...requestMessages.map((m, idx) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      image_url: m.imageUrl ?? null,
      image_file_id: m.imageFileId ?? null,
      sequence_number: idx,
    })),
    newAiMessage,
  ];
}

/**
 * save_design_session RPC를 호출해 디자인 채팅 세션을 저장한다.
 *
 * ⚠️  반드시 authenticated client(user JWT 보유)로 호출해야 한다.
 *    save_design_session은 auth.uid()로 호출자 소유권을 검증하므로
 *    user JWT가 없는 admin client(service role)로 호출하면 예외가 발생한다.
 *
 * 실패해도 예외를 던지지 않는다 (non-blocking).
 */
export async function saveDesignSession(
  supabaseClient: SupabaseClient,
  params: SessionSaveParams,
): Promise<void> {
  try {
    const { error } = await supabaseClient.rpc("save_design_session", {
      p_session_id: params.sessionId,
      p_ai_model: params.aiModel,
      p_first_message: params.firstMessage,
      p_last_image_url: params.lastImageUrl,
      p_last_image_file_id: params.lastImageFileId,
      p_messages: params.messages,
    });

    if (error) {
      console.error("save_design_session RPC 실패:", error.message);
    }
  } catch (err) {
    console.error("saveDesignSession 예기치 못한 오류:", err);
  }
}
