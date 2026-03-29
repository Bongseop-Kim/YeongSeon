import {
  expect,
  expectAuthenticatedRoute,
  hasConfiguredAuth,
  test,
} from "../fixtures/auth";
import {
  adminRollbackOrderStatus,
  seedRepairOrderInStatus,
  type SeededClaimOrder,
} from "../utils/store-data";
import { statusRow } from "../utils/admin-helpers";

test.describe.serial("Admin 수선 주문 관리", () => {
  test.skip(
    !hasConfiguredAuth("store") || !hasConfiguredAuth("admin"),
    "Store/Admin 테스트 계정 env가 필요합니다.",
  );

  let forwardOrder: SeededClaimOrder;
  let rollbackOrder: SeededClaimOrder;
  let cancelBtnOrder: SeededClaimOrder;
  let noRollbackOrder: SeededClaimOrder;

  test.beforeAll(async () => {
    // 4개 수선 주문을 동시에 생성
    [forwardOrder, rollbackOrder, cancelBtnOrder, noRollbackOrder] =
      await Promise.all([
        seedRepairOrderInStatus("접수"),
        seedRepairOrderInStatus("수선중"),
        seedRepairOrderInStatus("수선중"),
        seedRepairOrderInStatus("배송중"),
      ]);
  });

  // SC-repair-004: 접수 → 수선중
  test("접수 상태를 수선중으로 변경한다 (SC-repair-004)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/orders/show/${forwardOrder.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage, "/login");

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E repair processing");
    await authenticatedPage
      .getByRole("button", { name: "수선중으로 변경" })
      .click();
    await expect(statusRow(authenticatedPage, "수선중")).toBeVisible();
  });

  // SC-repair-005: 수선중 → 수선완료
  test("수선중 상태를 수선완료로 변경한다 (SC-repair-005)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/orders/show/${forwardOrder.orderId}`);

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E repair done");
    await authenticatedPage
      .getByRole("button", { name: "수선완료로 변경" })
      .click();
    await expect(statusRow(authenticatedPage, "수선완료")).toBeVisible();
  });

  // SC-repair-006: 수선완료 → 배송중
  test("수선완료 상태를 배송중으로 변경한다 (SC-repair-006)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/orders/show/${forwardOrder.orderId}`);

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E shipping start");
    await authenticatedPage
      .getByRole("button", { name: "배송중으로 변경" })
      .click();
    await expect(statusRow(authenticatedPage, "배송중")).toBeVisible();
  });

  // SC-repair-007: 배송중 → 배송완료 → 완료
  test("배송중에서 배송완료 → 완료 순서로 처리한다 (SC-repair-007)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/orders/show/${forwardOrder.orderId}`);

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E delivered");
    await authenticatedPage
      .getByRole("button", { name: "배송완료로 변경" })
      .click();
    await expect(statusRow(authenticatedPage, "배송완료")).toBeVisible();

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E complete");
    await authenticatedPage
      .getByRole("button", { name: "완료로 변경" })
      .click();
    await expect(statusRow(authenticatedPage, "완료")).toBeVisible();
  });

  // SC-repair-008: 수선중 상태에서 취소 처리 버튼 미노출
  test("수선중 상태에서 취소 처리 버튼이 표시되지 않는다 (SC-repair-008)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/orders/show/${cancelBtnOrder.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage, "/login");
    await expect(
      authenticatedPage.getByRole("button", { name: "취소 처리" }),
    ).not.toBeVisible();
  });

  // SC-repair-009: 수선중 → 접수 롤백 (API 처리 후 UI 검증)
  test("수선중 상태를 memo와 함께 접수로 롤백한다 (SC-repair-009)", async ({
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
      memo: "E2E repair rollback memo",
    });

    await authenticatedPage.goto(`/orders/show/${rollbackOrder.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage, "/login");

    await expect(statusRow(authenticatedPage, "접수")).toBeVisible();
    await expect(
      authenticatedPage.getByText("E2E repair rollback memo"),
    ).toBeVisible();
  });

  // SC-repair-010: 배송중 상태에서 롤백 버튼 미노출
  test("배송중 상태에서 롤백 버튼이 표시되지 않는다 (SC-repair-010)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/orders/show/${noRollbackOrder.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage, "/login");
    await expect(
      authenticatedPage.getByRole("button", { name: /으로 롤백/ }),
    ).not.toBeVisible();
  });
});
