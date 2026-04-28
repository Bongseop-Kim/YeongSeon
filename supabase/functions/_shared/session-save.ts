import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestSessionMessage } from "@/functions/_shared/design-request.ts";
import {
  sanitizeSessionAttachments,
  type SessionAttachment,
} from "@/functions/_shared/request-attachments.ts";

export interface SessionMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  image_url: string | null;
  image_file_id: string | null;
  attachments: SessionAttachment[] | null;
  sequence_number: number;
}

export interface SessionSaveParams {
  sessionId: string;
  aiModel: "openai";
  firstMessage: string;
  messages: SessionMessage[];
  repeatTileUrl?: string | null;
  repeatTileWorkId?: string | null;
  accentTileUrl?: string | null;
  accentTileWorkId?: string | null;
  accentLayout?: Record<string, unknown> | null;
  patternType?: "all_over" | "one_point" | null;
  fabricType?: "yarn_dyed" | "printed" | null;
}

export interface SessionSaveOptions {
  requireSuccess?: boolean;
}

export function buildSessionMessages(
  requestMessages: RequestSessionMessage[],
  newAiMessage: SessionMessage,
): SessionMessage[] {
  const normalizeMessageAttachments = (
    message: SessionMessage,
  ): SessionMessage => ({
    ...message,
    attachments: message.attachments ?? [],
  });

  return [
    ...requestMessages.map((m, idx) => {
      return {
        id: m.id,
        role: m.role,
        content: m.content,
        image_url: m.imageUrl ?? null,
        image_file_id: m.imageFileId ?? null,
        attachments: sanitizeSessionAttachments(m.attachments),
        sequence_number: idx,
      };
    }),
    normalizeMessageAttachments(newAiMessage),
  ];
}

/**
 * save_design_session RPC를 호출해 디자인 채팅 세션을 저장한다.
 *
 * ⚠️  반드시 authenticated client(user JWT 보유)로 호출해야 한다.
 *    save_design_session은 auth.uid()로 호출자 소유권을 검증하므로
 *    user JWT가 없는 admin client(service role)로 호출하면 예외가 발생한다.
 *
 * 기본값은 실패해도 예외를 던지지 않는다(non-blocking).
 * 저장 성공이 필수인 경로는 requireSuccess로 실패를 호출자에게 전달한다.
 */
export async function saveDesignSession(
  supabaseClient: SupabaseClient,
  params: SessionSaveParams,
  options: SessionSaveOptions = {},
): Promise<void> {
  try {
    const messages = params.messages.map((message) => ({
      ...message,
      attachments: message.attachments ?? [],
    }));

    const { error } = await supabaseClient.rpc("save_design_session", {
      p_session_id: params.sessionId,
      p_ai_model: params.aiModel,
      p_first_message: params.firstMessage,
      p_messages: messages,
      p_repeat_tile_url: params.repeatTileUrl ?? null,
      p_repeat_tile_work_id: params.repeatTileWorkId ?? null,
      p_accent_tile_url: params.accentTileUrl ?? null,
      p_accent_tile_work_id: params.accentTileWorkId ?? null,
      p_accent_layout_json: params.accentLayout ?? null,
      p_pattern_type: params.patternType ?? null,
      p_fabric_type: params.fabricType ?? null,
    });

    if (error) {
      const message = `save_design_session RPC 실패: ${error.message}`;
      console.error(message);
      if (options.requireSuccess) {
        throw new Error(message);
      }
    }
  } catch (err) {
    if (options.requireSuccess) {
      throw err;
    }
    console.error("saveDesignSession 예기치 못한 오류:", err);
  }
}
