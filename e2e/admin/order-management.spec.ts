import {
  expect,
  expectAuthenticatedRoute,
  hasConfiguredAuth,
  test,
} from "../fixtures/auth";
import {
  adminRollbackOrderStatus,
  createStoreClaim,
  seedSaleOrder,
  seedShippingOrder,
} from "../utils/store-data";
import { statusRow } from "../utils/admin-helpers";

test.describe.serial("Admin 주문 관리", () => {
  test.skip(
    !hasConfiguredAuth("store") || !hasConfiguredAuth("admin"),
    "Store/Admin 테스트 계정 env가 필요합니다.",
  );

  let managedOrder: Awaited<ReturnType<typeof seedSaleOrder>>;
  let rollbackOrder: Awaited<ReturnType<typeof seedSaleOrder>>;
  let claimOrder: Awaited<ReturnType<typeof seedSaleOrder>>;
  let claimSeed: Awaited<ReturnType<typeof createStoreClaim>>;
  let shippingOrder: Awaited<ReturnType<typeof seedShippingOrder>>;
  let cancelBtnOrder: Awaited<ReturnType<typeof seedShippingOrder>>;

  test.beforeAll(async () => {
    [managedOrder, rollbackOrder, shippingOrder, cancelBtnOrder, claimOrder] =
      await Promise.all([
        seedSaleOrder(),
        seedSaleOrder(),
        seedShippingOrder(),
        seedShippingOrder(),
        seedSaleOrder({ delivered: true }),
      ]);
    claimSeed = await createStoreClaim({
      type: "return",
      orderId: claimOrder.orderId,
      itemId: claimOrder.itemId,
      reason: "defect",
      description: "Admin E2E return claim",
    });
  });

  test("주문 목록에서 필터와 검색 결과를 확인한다", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/orders?tab=sale");

    await expectAuthenticatedRoute(authenticatedPage, "/login");
    await authenticatedPage
      .getByPlaceholder("주문번호 검색")
      .fill(managedOrder.orderNumber);
    await authenticatedPage.getByPlaceholder("주문번호 검색").press("Enter");

    const orderRow = authenticatedPage
      .locator("tr")
      .filter({ hasText: managedOrder.orderNumber })
      .first();
    await expect(orderRow).toBeVisible();
    await expect(orderRow).toContainText("대기중");
  });

  test("주문 상세 페이지에서 주문 정보와 아이템을 확인한다", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/orders/show/${managedOrder.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage, "/login");

    await expect(authenticatedPage.getByText("주문 정보")).toBeVisible();
    await expect(
      authenticatedPage.getByText(managedOrder.orderNumber),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByText(managedOrder.productName),
    ).toBeVisible();
    await expect(authenticatedPage.getByText("주문 아이템")).toBeVisible();
  });

  test("주문 상태를 대기중에서 배송중까지 순방향 전이한다", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/orders/show/${managedOrder.orderId}`);

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E forward transition");
    await authenticatedPage
      .getByRole("button", { name: "진행중으로 변경" })
      .click();
    await expect(statusRow(authenticatedPage, "진행중")).toBeVisible();

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E shipping transition");
    await authenticatedPage
      .getByRole("button", { name: "배송중으로 변경" })
      .click();
    await expect(statusRow(authenticatedPage, "배송중")).toBeVisible();
  });

  test("상태 롤백 시 memo 필수 검증과 반영 결과를 확인한다", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/orders/show/${rollbackOrder.orderId}`);

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E rollback setup");
    await authenticatedPage
      .getByRole("button", { name: "진행중으로 변경" })
      .click();
    await expect(statusRow(authenticatedPage, "진행중")).toBeVisible();
    await expect(
      adminRollbackOrderStatus({
        orderId: rollbackOrder.orderId,
        targetStatus: "대기중",
        memo: null,
      }),
    ).rejects.toThrow(/롤백 시 사유 입력 필수/);

    await adminRollbackOrderStatus({
      orderId: rollbackOrder.orderId,
      targetStatus: "대기중",
      memo: "E2E rollback memo",
    });
    await authenticatedPage.reload();

    await expect(statusRow(authenticatedPage, "대기중")).toBeVisible();
    await expect(
      authenticatedPage.getByText("E2E rollback memo"),
    ).toBeVisible();
  });

  test("배송중에서 배송완료, 완료까지 순방향 전이한다 (SC-sale-013, SC-sale-014)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/orders/show/${shippingOrder.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage, "/login");

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E delivered transition");
    await authenticatedPage
      .getByRole("button", { name: "배송완료로 변경" })
      .click();
    await expect(statusRow(authenticatedPage, "배송완료")).toBeVisible();

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E complete transition");
    await authenticatedPage
      .getByRole("button", { name: "완료로 변경" })
      .click();
    await expect(statusRow(authenticatedPage, "완료")).toBeVisible();
  });

  test("배송중 상태에서 취소 버튼이 표시되지 않는다 (SC-sale-015)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/orders/show/${cancelBtnOrder.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage, "/login");
    await expect(
      authenticatedPage.getByRole("button", { name: /취소/ }),
    ).not.toBeVisible();
  });

  test("클레임 상세에서 승인 처리 결과를 검증한다", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/claims");
    await expectAuthenticatedRoute(authenticatedPage, "/login");

    await expect(
      authenticatedPage.getByRole("cell", { name: claimSeed.claimNumber }),
    ).toBeVisible();
    await authenticatedPage.goto(`/claims/show/${claimSeed.claimId}`);

    await expect(authenticatedPage.getByText("클레임 정보")).toBeVisible();
    await expect(
      authenticatedPage.getByText(claimSeed.claimNumber),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByText(claimOrder.orderNumber),
    ).toBeVisible();

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E claim approval");
    await authenticatedPage
      .getByRole("button", { name: "수거요청 으로 변경" })
      .click();

    await expect(authenticatedPage.getByText("수거요청")).toBeVisible();
  });
});
