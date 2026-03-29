export interface TokenUsageItem {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string;
  workId: string | null;
}

export interface MergedTokenItem {
  id: string;
  netAmount: number;
  description: string | null;
  createdAt: string;
  type: string;
}

export function extractBaseWorkId(workId: string | null): string | null {
  if (!workId) return null;
  return workId.replace(/_use_paid$|_use_bonus$/, "");
}

export function mergeTokenUsageItems(
  items: TokenUsageItem[],
): MergedTokenItem[] {
  const groupMap = new Map<string, { baseItem: TokenUsageItem; net: number }>();
  const standalone: TokenUsageItem[] = [];

  for (const item of items) {
    const baseId = extractBaseWorkId(item.workId);

    if ((item.type === "use" || item.type === "refund") && baseId) {
      const entry = groupMap.get(baseId);
      if (entry) {
        entry.net += item.amount;
        if (item.type === "use") entry.baseItem = item;
      } else {
        groupMap.set(baseId, { baseItem: item, net: item.amount });
      }
    } else {
      standalone.push(item);
    }
  }

  return [
    ...Array.from(groupMap.values()).map(({ baseItem, net }) => ({
      id: baseItem.id,
      netAmount: net,
      description: baseItem.description,
      createdAt: baseItem.createdAt,
      type: baseItem.type,
    })),
    ...standalone.map((item) => ({
      id: item.id,
      netAmount: item.amount,
      description: item.description,
      createdAt: item.createdAt,
      type: item.type,
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
