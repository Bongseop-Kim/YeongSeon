import { supabase } from "@/shared/lib/supabase";
import {
  toDesignSession,
  toDesignSessionMessage,
  type DesignSessionRow,
  type DesignSessionMessageRow,
} from "@/features/design/api/design-session-mapper";
import type {
  DesignSession,
  DesignSessionMessage,
} from "@/features/design/types/session";

export interface SaveDesignSessionParams {
  sessionId: string;
  aiModel: "openai" | "gemini";
  firstMessage: string;
  lastImageUrl: string | null;
  lastImageFileId: string | null;
  messages: {
    id: string;
    role: "user" | "ai";
    content: string;
    imageUrl: string | null;
    imageFileId: string | null;
    sequenceNumber: number;
  }[];
}

export async function saveDesignSession(
  params: SaveDesignSessionParams,
): Promise<void> {
  const { error } = await supabase.rpc("save_design_session", {
    p_session_id: params.sessionId,
    p_ai_model: params.aiModel,
    p_first_message: params.firstMessage,
    p_last_image_url: params.lastImageUrl,
    p_last_image_file_id: params.lastImageFileId,
    p_messages: params.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      image_url: m.imageUrl,
      image_file_id: m.imageFileId,
      sequence_number: m.sequenceNumber,
    })),
  });

  if (error) {
    throw new Error(`세션 저장 실패: ${error.message}`);
  }
}

export async function getDesignSessions(): Promise<DesignSession[]> {
  const { data, error } = await supabase
    .from("design_chat_sessions")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`세션 목록 조회 실패: ${error.message}`);
  }

  const rows: DesignSessionRow[] = data ?? [];
  return rows.map(toDesignSession);
}

export async function getDesignSessionMessages(
  sessionId: string,
): Promise<DesignSessionMessage[]> {
  const { data, error } = await supabase
    .from("design_chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("sequence_number", { ascending: true });

  if (error) {
    throw new Error(`세션 메시지 조회 실패: ${error.message}`);
  }

  const rows: DesignSessionMessageRow[] = data ?? [];
  return rows.map(toDesignSessionMessage);
}
