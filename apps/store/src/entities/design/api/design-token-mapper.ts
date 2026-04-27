import {
  DESIGN_TOKEN_SELECT_FIELDS,
  type DesignTokenRow,
} from "@yeongseon/shared";
import type { DesignTokenHistoryItem } from "@/entities/design/model/token-history";

export { DESIGN_TOKEN_SELECT_FIELDS, type DesignTokenRow };

export function toDesignTokenHistoryItem(
  row: DesignTokenRow,
): DesignTokenHistoryItem {
  return {
    id: row.id,
    amount: row.amount,
    type: row.type,
    aiModel: row.ai_model,
    requestType: row.request_type,
    description: row.description,
    createdAt: row.created_at,
    workId: row.work_id,
  };
}
