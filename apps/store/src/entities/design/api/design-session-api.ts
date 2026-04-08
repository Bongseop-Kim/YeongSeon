import { supabase } from "@/shared/lib/supabase";
import {
  toDesignSession,
  toDesignSessionMessage,
  type DesignSessionMessageRow,
  type DesignSessionRow,
} from "@/entities/design/api/design-session-mapper";
import type {
  DesignSession,
  DesignSessionMessage,
} from "@/entities/design/model/design-session";

const DESIGN_SESSION_SELECT_FIELDS =
  "id, user_id, ai_model, first_message, last_image_url, last_image_file_id, image_count, created_at, updated_at";

const DESIGN_SESSION_MESSAGE_SELECT_FIELDS =
  "id, session_id, role, content, image_url, image_file_id, sequence_number, created_at";

export async function getDesignSessions(): Promise<DesignSession[]> {
  const { data, error } = await supabase
    .from("design_chat_sessions")
    .select(DESIGN_SESSION_SELECT_FIELDS)
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
    .select(DESIGN_SESSION_MESSAGE_SELECT_FIELDS)
    .eq("session_id", sessionId)
    .order("sequence_number", { ascending: true });

  if (error) {
    throw new Error(`세션 메시지 조회 실패: ${error.message}`);
  }

  const rows: DesignSessionMessageRow[] = data ?? [];
  return rows.map(toDesignSessionMessage);
}
