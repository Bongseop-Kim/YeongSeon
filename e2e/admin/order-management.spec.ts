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
} from "../utils/store-data";

test.describe.serial("Admin 주문 관리", () => {
  test.skip(
    !hasConfiguredAuth("store") || !hasConfiguredAuth("admin"),
    "Store/Admin 테스트 계정 env가 필요합니다.",
  );

  let managedOrder: Awaited<ReturnType<typeof seedSaleOrder>>;
  let rollbackOrder: Awaited<ReturnType<typeof seedSaleOrder>>;
  let claimOrder: Awaited<ReturnType<typeof seedSaleOrder>>;
  let claimSeed: Awaited<ReturnType<typeof createStoreClaim>>;

  test.beforeAll(async () => {
    managedOrder = await seedSaleOrder();
    rollbackOrder = await seedSaleOrder();
    claimOrder = await seedSaleOrder({ delivered: true });
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
    await expect(authenticatedPage.getByText("진행중")).toBeVisible();

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E shipping transition");
    await authenticatedPage
      .getByRole("button", { name: "배송중으로 변경" })
      .click();
    await expect(authenticatedPage.getByText("배송중")).toBeVisible();
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
    await expect(authenticatedPage.getByText("진행중")).toBeVisible();
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

    const orderInfoRow = authenticatedPage
      .locator("tr")
      .filter({ hasText: "상태" })
      .filter({ hasText: "대기중" })
      .first();
    await expect(orderInfoRow).toBeVisible();
    await expect(
      authenticatedPage.getByText("E2E rollback memo"),
    ).toBeVisible();
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
