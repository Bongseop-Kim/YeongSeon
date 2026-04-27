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

export const DESIGN_TOKEN_SELECT_FIELDS =
  "id, user_id, amount, type, ai_model, request_type, description, created_at, work_id";
