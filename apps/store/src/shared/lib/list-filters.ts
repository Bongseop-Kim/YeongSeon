import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";

export interface ListFilters {
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const normalizeKeyword = (keyword?: string) =>
  keyword?.trim().toLowerCase() ?? "";

export const applyDateFilters = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgrestFilterBuilder 제네릭은 SDK 타입 제약상 구체화하기 어렵다
  T extends PostgrestFilterBuilder<any, any, any, any>,
>(
  query: T,
  filters?: Pick<ListFilters, "dateFrom" | "dateTo">,
): T => {
  let filteredQuery = query;

  if (filters?.dateFrom) {
    filteredQuery = filteredQuery.gte("date", filters.dateFrom);
  }

  if (filters?.dateTo) {
    filteredQuery = filteredQuery.lte("date", filters.dateTo);
  }

  return filteredQuery;
};

export const toDateString = (date?: Date): string | undefined => {
  if (!date || Number.isNaN(date.getTime())) {
    return undefined;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
