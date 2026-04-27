import type { DesignTokenHistoryItem } from "@/entities/design/model/token-history";
import {
  DESIGN_TOKEN_SELECT_FIELDS,
  toDesignTokenHistoryItem,
  type DesignTokenRow,
} from "@/entities/design/api/design-token-mapper";
import { escapeIlikePattern } from "@/shared/lib/ilike-escape";
import { supabase } from "@/shared/lib/supabase";

interface DesignTokenBalance {
  total: number;
  paid: number;
  bonus: number;
}

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
  types?: readonly string[];
  keyword?: string;
}

export async function getDesignTokenHistory(
  params: GetDesignTokenHistoryParams,
): Promise<DesignTokenHistoryItem[]> {
  let query = supabase
    .from("design_tokens")
    .select(DESIGN_TOKEN_SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (params.dateFrom) {
    query = query.gte("created_at", toKstDayBoundaryUtcIso(params.dateFrom, 0));
  }
  if (params.dateTo) {
    query = query.lt("created_at", toKstDayBoundaryUtcIso(params.dateTo, 1));
  }
  if (params.types && params.types.length > 0) {
    query = query.in("type", [...params.types]);
  }

  const keyword = params.keyword?.trim();
  if (keyword) {
    query = query.ilike("description", `%${escapeIlikePattern(keyword)}%`);
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

function toKstDayBoundaryUtcIso(yyyyMmDd: string, dayOffset: number): string {
  const [year, month, day] = yyyyMmDd.split("-").map(Number);
  const utcTime =
    Date.UTC(year, month - 1, day + dayOffset) - 9 * 60 * 60 * 1000;
  return new Date(utcTime).toISOString();
}
