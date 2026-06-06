import type {
  AdminRepairPickupRequest,
  AdminRepairShippingPhoto,
  AdminRepairShippingReceipt,
} from "@/features/orders/types/admin-order";

export interface RepairPickupRequestRowDTO {
  id: string;
  recipient_name: string;
  recipient_phone: string;
  postal_code: string | null;
  address: string;
  detail_address: string | null;
  pickup_fee: number;
  created_at: string;
}

export interface RepairShippingReceiptRowDTO {
  id: string;
  receipt_type: "tracking" | "no_tracking";
  reason: string | null;
  memo: string | null;
  photos: unknown;
  created_at: string;
}

const toReceiptPhotos = (photos: unknown): AdminRepairShippingPhoto[] => {
  if (!Array.isArray(photos)) return [];
  return photos.filter(
    (photo): photo is AdminRepairShippingPhoto =>
      typeof photo === "object" &&
      photo !== null &&
      typeof (photo as { url?: unknown }).url === "string" &&
      typeof (photo as { fileId?: unknown }).fileId === "string",
  );
};

export function mapRepairPickupRequestRow(
  row: RepairPickupRequestRowDTO,
): AdminRepairPickupRequest {
  return {
    id: row.id,
    recipientName: row.recipient_name,
    recipientPhone: row.recipient_phone,
    postalCode: row.postal_code,
    address: row.address,
    detailAddress: row.detail_address,
    pickupFee: row.pickup_fee,
    createdAt: row.created_at,
  };
}

export function mapRepairShippingReceiptRow(
  row: RepairShippingReceiptRowDTO,
): AdminRepairShippingReceipt {
  return {
    id: row.id,
    receiptType: row.receipt_type,
    reason: row.reason,
    memo: row.memo,
    photos: toReceiptPhotos(row.photos),
    createdAt: row.created_at,
  };
}
