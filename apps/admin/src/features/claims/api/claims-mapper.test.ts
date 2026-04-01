import { describe, expect, it } from "vitest";
import {
  toAdminClaimDetail,
  toAdminClaimListItem,
  toAdminClaimStatusLogEntry,
} from "@/features/claims/api/claims-mapper";
import {
  createAdminClaimListRowDTO,
  createClaimStatusLogDTO,
} from "@/test/fixtures";

describe("toAdminClaimListItem", () => {
  it("목록 필드를 그대로 매핑한다", () => {
    expect(toAdminClaimListItem(createAdminClaimListRowDTO())).toEqual({
      id: "claim-1",
      claimNumber: "CLM-001",
      createdAt: "2026-03-15T09:00:00Z",
      claimType: "return",
      status: "접수",
      reason: "불량",
      customerName: "홍길동",
      orderNumber: "ORD-001",
      productName: "테스트 넥타이",
    });
  });
});

describe("toAdminClaimDetail", () => {
  it("tracking 정보와 refundData를 매핑한다", () => {
    expect(toAdminClaimDetail(createAdminClaimListRowDTO())).toEqual(
      expect.objectContaining({
        createdAt: "2026-03-15T09:00:00Z",
        returnTracking: {
          courierCompany: "CJ대한통운",
          trackingNumber: "RT-123",
        },
        resendTracking: {
          courierCompany: "한진택배",
          trackingNumber: "RS-456",
        },
        refundData: {
          paidTokenAmount: 10,
          bonusTokenAmount: 5,
          refundAmount: 15000,
        },
      }),
    );
  });

  it("tracking 번호나 택배사가 없으면 null을 반환한다", () => {
    expect(
      toAdminClaimDetail(
        createAdminClaimListRowDTO({
          returnCourierCompany: null,
          returnTrackingNumber: "RT-123",
          resendCourierCompany: "한진택배",
          resendTrackingNumber: null,
          refund_data: null,
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        returnTracking: null,
        resendTracking: null,
        refundData: null,
      }),
    );
  });
});

describe("toAdminClaimStatusLogEntry", () => {
  it("상태 로그 필드를 그대로 매핑한다", () => {
    expect(toAdminClaimStatusLogEntry(createClaimStatusLogDTO())).toEqual({
      id: "claim-status-log-1",
      claimId: "claim-1",
      changedBy: "admin-1",
      previousStatus: "접수",
      newStatus: "처리중",
      memo: "확인 완료",
      isRollback: false,
      createdAt: "2026-03-15T11:30:00Z",
    });
  });

  it("changedBy가 null이어도 그대로 매핑한다", () => {
    expect(
      toAdminClaimStatusLogEntry(createClaimStatusLogDTO({ changedBy: null })),
    ).toEqual(
      expect.objectContaining({
        changedBy: null,
      }),
    );
  });
});
