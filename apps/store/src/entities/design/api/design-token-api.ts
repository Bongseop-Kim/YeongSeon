import type { DesignTokenHistoryItem } from "@/entities/design/model/token-history";
import { supabase } from "@/shared/lib/supabase";

interface DesignTokenRow {
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

interface DesignTokenBalance {
  total: number;
  paid: number;
  bonus: number;
}

const DESIGN_TOKEN_SELECT_FIELDS =
  "id, user_id, amount, type, ai_model, request_type, description, created_at, work_id";

const toDesignTokenHistoryItem = (
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

export async function getDesignTokenBalance(): Promise<DesignTokenBalance> {
  const { data, error } = await supabase.rpc("get_design_token_balance");

  if (error) {
    throw new Error(`토큰 잔액 조회 실패: ${error.message}`);
  }

  const raw: { total?: number; paid?: number; bonus?: number } | null = data;
  return {
    total: raw?.total ?? 0,
    paid: raw?.paid ?? 0,
    bonus: raw?.bonus ?? 0,
  };
}

interface GetDesignTokenHistoryParams {
  limit: number;
  offset: number;
  dateFrom?: string;
  dateTo?: string;
}

export async function getDesignTokenHistory(
  params: GetDesignTokenHistoryParams,
): Promise<DesignTokenHistoryItem[]> {
  let query = supabase
    .from("design_tokens")
    .select(DESIGN_TOKEN_SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (params.dateFrom) {
    query = query.gte("created_at", `${params.dateFrom}T00:00:00`);
  }
  if (params.dateTo) {
    query = query.lt("created_at", `${nextDay(params.dateTo)}T00:00:00`);
  }

  const { data, error } = await query.range(
    params.offset,
    params.offset + params.limit - 1,
  );

  if (error) {
    throw new Error(`토큰 내역 조회 실패: ${error.message}`);
  }

  const rows: DesignTokenRow[] = data ?? [];
  return rows.map(toDesignTokenHistoryItem);
}

const nextDay = (yyyyMmDd: string): string => {
  const date = new Date(`${yyyyMmDd}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};
