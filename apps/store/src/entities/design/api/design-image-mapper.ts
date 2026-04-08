import type { DesignImage } from "@/entities/design/model/design-image";

export interface DesignImageRow {
  image_url: string;
  image_file_id: string;
  created_at: string;
  design_chat_sessions: { first_message: string } | null;
}

export function toDesignImage(row: DesignImageRow): DesignImage {
  return {
    imageUrl: row.image_url,
    imageFileId: row.image_file_id,
    createdAt: row.created_at,
    sessionFirstMessage: row.design_chat_sessions?.first_message ?? "",
  };
}
