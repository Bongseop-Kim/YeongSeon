import type { DesignTokenHistoryItem } from "@/entities/design/model/token-history";

export interface DesignTokenRow {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  ai_model: string | null;
  request_type: string | null;
  description: string | null;
  created_at: string;
  work_id: string | null;
}

export const toDesignTokenHistoryItem = (
  row: DesignTokenRow,
): DesignTokenHistoryItem => ({
  id: row.id,
  amount: row.amount,
  type: row.type,
  aiModel: row.ai_model,
  requestType: row.request_type,
  description: row.description,
  createdAt: row.created_at,
  workId: row.work_id,
});
