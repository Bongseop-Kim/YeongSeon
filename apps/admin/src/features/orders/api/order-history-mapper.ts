import type { ClaimStatusLogDTO, OrderStatusLogDTO } from "@yeongseon/shared";
import type {
  AdminOrderHistoryClaimEntry,
  AdminOrderHistoryEntry,
  AdminOrderHistoryOrderEntry,
} from "@/features/orders/types/admin-order";

function toAdminOrderHistoryOrderEntry(
  dto: OrderStatusLogDTO,
): AdminOrderHistoryOrderEntry {
  return {
    id: dto.id,
    kind: "order",
    orderId: dto.orderId,
    changedBy: dto.changedBy,
    previousStatus: dto.previousStatus,
    newStatus: dto.newStatus,
    memo: dto.memo,
    isRollback: dto.isRollback,
    createdAt: dto.createdAt,
  };
}

function toAdminOrderHistoryClaimEntry(
  dto: ClaimStatusLogDTO,
): AdminOrderHistoryClaimEntry {
  return {
    id: dto.id,
    kind: "claim",
    orderId: dto.orderId,
    claimId: dto.claimId,
    claimNumber: dto.claimNumber,
    claimType: dto.claimType,
    changedBy: dto.changedBy ?? null,
    previousStatus: dto.previousStatus,
    newStatus: dto.newStatus,
    memo: dto.memo,
    isRollback: dto.isRollback,
    createdAt: dto.createdAt,
  };
}

function toTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function compareHistoryEntries(
  left: AdminOrderHistoryEntry,
  right: AdminOrderHistoryEntry,
) {
  const createdAtDiff =
    toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
  if (createdAtDiff !== 0) return createdAtDiff;

  return right.id.localeCompare(left.id);
}

export function toAdminOrderHistoryEntries({
  orderLogs,
  claimLogs,
}: {
  orderLogs: OrderStatusLogDTO[];
  claimLogs: ClaimStatusLogDTO[];
}): AdminOrderHistoryEntry[] {
  return [
    ...orderLogs.map(toAdminOrderHistoryOrderEntry),
    ...claimLogs.map(toAdminOrderHistoryClaimEntry),
  ].sort(compareHistoryEntries);
}
