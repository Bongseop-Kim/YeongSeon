export interface ListFilters {
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const normalizeKeyword = (keyword?: string) => keyword?.trim().toLowerCase() ?? "";

export const toDateString = (date?: Date): string | undefined => {
  if (!date || Number.isNaN(date.getTime())) {
    return undefined;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
