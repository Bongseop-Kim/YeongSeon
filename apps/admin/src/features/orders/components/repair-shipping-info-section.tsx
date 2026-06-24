import { Text } from "seed-design/ui/text";
import { formatDate } from "@yeongseon/shared/utils/format-date";
import { getRepairNoTrackingReasonLabel } from "@yeongseon/shared/constants/repair-shipping";
import type {
  AdminRepairPickupRequest,
  AdminRepairShippingReceipt,
} from "@/features/orders/types/admin-order";
import { OrderDetailGrid, OrderDetailItem } from "./order-detail-grid";

interface RepairShippingInfoSectionProps {
  pickupRequest: AdminRepairPickupRequest | null;
  receipts: AdminRepairShippingReceipt[];
}

/**
 * 수선품 발송 부가 정보:
 *   - 방문 수거 신청 (수거지/수거비) — 상태 '수거예정'의 근거
 *   - 고객 발송 접수 기록 (송장 없는 접수 사유/메모/사진) — 상태 '발송확인중'의 근거
 */
export function RepairShippingInfoSection({
  pickupRequest,
  receipts,
}: RepairShippingInfoSectionProps) {
  if (!pickupRequest && receipts.length === 0) return null;

  return (
    <div className="orderOptionCard orderRepairDetailCard">
      <Text as="h2" textStyle="t6Bold" className="orderSectionTitle">
        수선품 발송 정보
      </Text>

      {pickupRequest ? (
        <section className="orderRepairCard">
          <Text as="h3" textStyle="t5Bold" className="orderSubsectionTitle">
            방문 수거 신청
          </Text>
          <OrderDetailGrid>
            <OrderDetailItem label="이름">
              {pickupRequest.recipientName}
            </OrderDetailItem>
            <OrderDetailItem label="연락처">
              {pickupRequest.recipientPhone}
            </OrderDetailItem>
            <OrderDetailItem label="수거지 주소" full>
              {[
                pickupRequest.address,
                pickupRequest.detailAddress,
                pickupRequest.postalCode
                  ? `(${pickupRequest.postalCode})`
                  : null,
              ]
                .filter(Boolean)
                .join(" ")}
            </OrderDetailItem>
            <OrderDetailItem label="수거비">
              {pickupRequest.pickupFee.toLocaleString()}원
            </OrderDetailItem>
            <OrderDetailItem label="신청 시각">
              {formatDate(pickupRequest.createdAt)}
            </OrderDetailItem>
          </OrderDetailGrid>
        </section>
      ) : null}

      {receipts.map((receipt) => (
        <section key={receipt.id} className="orderRepairCard">
          <Text as="h3" textStyle="t5Bold" className="orderSubsectionTitle">
            {receipt.receiptType === "no_tracking"
              ? "송장 없는 발송 접수"
              : "발송 사진"}
          </Text>
          <OrderDetailGrid>
            {receipt.receiptType === "no_tracking" ? (
              <OrderDetailItem label="사유">
                {getRepairNoTrackingReasonLabel(receipt.reason)}
              </OrderDetailItem>
            ) : null}
            <OrderDetailItem label="접수 시각">
              {formatDate(receipt.createdAt)}
            </OrderDetailItem>
            {receipt.memo ? (
              <OrderDetailItem label="메모" full>
                {receipt.memo}
              </OrderDetailItem>
            ) : null}
            {receipt.photos.length > 0 ? (
              <OrderDetailItem label="사진" full>
                <div className="orderPhotoRow">
                  {receipt.photos.map((photo) => (
                    <a
                      key={photo.fileId}
                      href={photo.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        className="orderPreviewImage"
                        src={photo.url}
                        alt="고객 발송 사진"
                        width={120}
                        height={120}
                      />
                    </a>
                  ))}
                </div>
              </OrderDetailItem>
            ) : null}
          </OrderDetailGrid>
        </section>
      ))}
    </div>
  );
}
