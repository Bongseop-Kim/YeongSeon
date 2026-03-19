import {
  expect,
  expectAuthenticatedRoute,
  hasConfiguredAuth,
  test,
} from "@/fixtures/auth";
import {
  adminRollbackOrderStatus,
  adminUpdateOrderStatus,
  seedCustomOrder,
  type SeededClaimOrder,
} from "@/utils/store-data";
import { statusRow } from "@/utils/admin-helpers";

test.describe.serial("Admin 주문 제작 관리", () => {
  test.skip(
    !hasConfiguredAuth("store") || !hasConfiguredAuth("admin"),
    "Store/Admin 테스트 계정 env가 필요합니다.",
  );

  // SC-custom-004: 접수 → 제작중
  let noSampleOrder: SeededClaimOrder;

  // SC-custom-009: 제작중 취소 버튼 미노출
  let cancelBtnOrder: SeededClaimOrder;

  // SC-custom-010: 제작중 → 접수 롤백
  let rollbackOrder: SeededClaimOrder;

  // SC-custom-008용: 이미 제작중 상태인 별도 주문
  let shippingForwardOrder: SeededClaimOrder;

  test.beforeAll(async () => {
    [noSampleOrder, cancelBtnOrder, rollbackOrder, shippingForwardOrder] =
      await Promise.all([
        // SC-custom-004용: 접수 상태
        seedCustomOrder().then(async (o) => {
          await adminUpdateOrderStatus(o.orderId, "접수");
          o.status = "접수";
          return o;
        }),
        // SC-custom-009용: 제작중 상태
        seedCustomOrder().then(async (o) => {
          await adminUpdateOrderStatus(o.orderId, "접수");
          await adminUpdateOrderStatus(o.orderId, "제작중");
          o.status = "제작중";
          return o;
        }),
        // SC-custom-010용: 제작중 상태
        seedCustomOrder().then(async (o) => {
          await adminUpdateOrderStatus(o.orderId, "접수");
          await adminUpdateOrderStatus(o.orderId, "제작중");
          o.status = "제작중";
          return o;
        }),
        // SC-custom-008용: 시드 후 제작중까지 선행 전이된 상태
        seedCustomOrder().then(async (o) => {
          await adminUpdateOrderStatus(o.orderId, "접수");
          await adminUpdateOrderStatus(o.orderId, "제작중");
          o.status = "제작중";
          return o;
        }),
      ]);
  });

  // SC-custom-004: admin 접수 → 제작중 (샘플 없음)
  test("접수 상태를 제작중으로 변경한다 (SC-custom-004)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/orders/show/${noSampleOrder.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage, "/login");

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E custom processing");
    await authenticatedPage
      .getByRole("button", { name: "제작중으로 변경" })
      .click();
    await expect(
      authenticatedPage
        .locator("tr")
        .filter({ hasText: "상태" })
        .filter({ hasText: "제작중" })
        .first(),
    ).toBeVisible();
  });

  // SC-custom-008: admin 제작중 → 제작완료 → 배송중
  test("제작중 상태를 제작완료 → 배송중 순서로 처리한다 (SC-custom-008)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(
      `/orders/show/${shippingForwardOrder.orderId}`,
    );
    await expectAuthenticatedRoute(authenticatedPage, "/login");

    // 제작중 → 제작완료
    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E production done");
    await authenticatedPage
      .getByRole("button", { name: "제작완료로 변경" })
      .click();
    await expect(statusRow(authenticatedPage, "제작완료")).toBeVisible();

    // 제작완료 → 배송중
    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E shipping start");
    await authenticatedPage
      .getByRole("button", { name: "배송중으로 변경" })
      .click();
    await expect(statusRow(authenticatedPage, "배송중")).toBeVisible();
  });

  // SC-custom-009: admin 제작중 취소 버튼 미노출
  test("제작중 상태에서 취소 처리 버튼이 표시되지 않는다 (SC-custom-009)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/orders/show/${cancelBtnOrder.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage, "/login");
    await expect(
      authenticatedPage.getByRole("button", { name: "취소 처리" }),
    ).not.toBeVisible();
  });

  // SC-custom-010: admin 제작중 → 접수 롤백
  test("제작중 상태를 memo와 함께 접수로 롤백한다 (SC-custom-010)", async ({
    authenticatedPage,
  }) => {
    // memo 없이 롤백 시 에러 발생 검증
    await expect(
      adminRollbackOrderStatus({
        orderId: rollbackOrder.orderId,
        targetStatus: "접수",
        memo: null,
      }),
    ).rejects.toThrow();

    // memo와 함께 롤백
    await adminRollbackOrderStatus({
      orderId: rollbackOrder.orderId,
      targetStatus: "접수",
      memo: "E2E custom rollback memo",
    });

    await authenticatedPage.goto(`/orders/show/${rollbackOrder.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage, "/login");

    const statusRow = authenticatedPage
      .locator("tr")
      .filter({ hasText: "상태" })
      .filter({ hasText: "접수" })
      .first();
    await expect(statusRow).toBeVisible();
    await expect(
      authenticatedPage.getByText("E2E custom rollback memo"),
    ).toBeVisible();
  });
});
