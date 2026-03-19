import {
  expect,
  expectAuthenticatedRoute,
  hasConfiguredAuth,
  test,
} from "@/fixtures/auth";
import {
  type CreateOrderResult,
  adminUpdateOrderStatus,
  seedRepairOrder,
} from "@/utils/store-data";
import { installMockToss } from "@/utils/mock-toss";

test.describe.serial("Store 수선 주문 플로우", () => {
  test.skip(
    !hasConfiguredAuth("store") || !hasConfiguredAuth("admin"),
    "Store/Admin 테스트 계정 env가 필요합니다.",
  );

  let repairOrderForList: Awaited<ReturnType<typeof seedRepairOrder>>;
  let repairOrderAtReceived: Awaited<ReturnType<typeof seedRepairOrder>>;
  let repairOrderAtInProgress: Awaited<ReturnType<typeof seedRepairOrder>>;
  let latestRepairOrderId: string | null = null;

  test.beforeAll(async () => {
    [repairOrderForList, repairOrderAtReceived, repairOrderAtInProgress] =
      await Promise.all([
        // SC-repair-003용: 접수 상태
        seedRepairOrder().then(async (o) => {
          await adminUpdateOrderStatus(o.orderId, "접수");
          o.status = "접수";
          return o;
        }),
        // SC-repair-011용: 접수 상태
        seedRepairOrder().then(async (o) => {
          await adminUpdateOrderStatus(o.orderId, "접수");
          o.status = "접수";
          return o;
        }),
        // SC-repair-012용: 수선중 상태
        seedRepairOrder().then(async (o) => {
          await adminUpdateOrderStatus(o.orderId, "접수");
          await adminUpdateOrderStatus(o.orderId, "수선중");
          o.status = "수선중";
          return o;
        }),
      ]);
  });

  // SC-repair-001: 수선 아이템 추가
  test("수선 페이지에서 넥타이 추가 버튼을 누르면 수선 항목이 추가된다 (SC-repair-001)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/reform");
    await expectAuthenticatedRoute(authenticatedPage);

    // 기본 1개 → 넥타이 추가 클릭 → 2개
    await authenticatedPage
      .getByRole("button", { name: "넥타이 추가" })
      .click();

    // 2번째 tie-item 카드가 렌더링되는지 확인 (측정 방식 라디오 버튼이 2개 그룹 존재)
    const measurementLabels = authenticatedPage.getByText("측정 방식");
    await expect(measurementLabels).toHaveCount(2);
  });

  // SC-repair-002: 수선 주문 결제 (mock)
  test("수선 주문 결제 후 주문 상세 페이지로 이동한다 (SC-repair-002)", async ({
    authenticatedPage,
  }) => {
    await installMockToss(authenticatedPage, "success");

    let createOrderResult: CreateOrderResult | null = null;

    await authenticatedPage.route(
      "**/functions/v1/create-order",
      async (route) => {
        const response = await route.fetch();
        const payload = (await response.json()) as CreateOrderResult;
        createOrderResult = payload;
        await route.fulfill({ response });
      },
    );

    await authenticatedPage.route(
      "**/functions/v1/confirm-payment",
      async (route) => {
        const request = route.request().postDataJSON() as {
          paymentKey: string;
          orderId: string;
        };
        if (!createOrderResult) {
          throw new Error("create-order 응답을 아직 캡처하지 못했습니다.");
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            paymentKey: request.paymentKey,
            paymentGroupId: request.orderId,
            status: "DONE",
            orders: createOrderResult.orders.map((order) => ({
              orderId: order.order_id,
              orderType: order.order_type,
            })),
          }),
        });
      },
    );

    await authenticatedPage.goto("/reform");
    await expectAuthenticatedRoute(authenticatedPage);

    // 수선 길이 입력 (첫 번째 tie 카드)
    await authenticatedPage.locator('input[type="number"]').first().fill("145");

    // 주문하기 클릭
    await authenticatedPage.getByRole("button", { name: "주문하기" }).click();
    await expect(authenticatedPage).toHaveURL(/\/order\/order-form$/);

    // 주문 제출
    await authenticatedPage.getByTestId("order-submit-button").click();

    // repair 주문 ID 캡처
    await expect
      .poll(() => {
        const result = createOrderResult as CreateOrderResult | null;
        return (
          result?.orders.find((o) => o.order_type === "repair")?.order_id ??
          null
        );
      })
      .not.toBeNull();
    const capturedResult = createOrderResult as CreateOrderResult | null;
    latestRepairOrderId =
      capturedResult?.orders.find((o) => o.order_type === "repair")?.order_id ??
      null;

    // 주문 상세 페이지로 이동
    await expect(authenticatedPage).toHaveURL(
      new RegExp(`/order/${latestRepairOrderId}$`),
    );
    await expect(
      authenticatedPage.getByTestId("order-detail-root"),
    ).toBeVisible();
  });

  // SC-repair-003: 주문 목록 수선 탭 조회
  test("주문 목록에서 수선 주문 카드가 표시된다 (SC-repair-003)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/order/order-list");
    await expectAuthenticatedRoute(authenticatedPage);
    await authenticatedPage.getByRole("tab", { name: "수선" }).click();
    await expect(
      authenticatedPage.getByRole("tab", { name: "수선", selected: true }),
    ).toBeVisible();

    await expect(
      authenticatedPage
        .locator('[role="tabpanel"]')
        .getByTestId(`order-card-${repairOrderForList.orderId}`),
    ).toBeVisible();
  });

  // SC-repair-011: 고객 접수 상태 취소 요청
  test("접수 상태 수선 주문에서 취소 요청을 하면 취소 클레임이 접수된다 (SC-repair-011)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/order/${repairOrderAtReceived.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage);

    await authenticatedPage.getByRole("button", { name: "취소 요청" }).click();

    await expect(authenticatedPage).toHaveURL(
      new RegExp(
        `/order/claim/cancel/${repairOrderAtReceived.orderId}/${repairOrderAtReceived.itemId}$`,
      ),
    );

    await expect(
      authenticatedPage.getByText("취소 신청", { exact: true }),
    ).toBeVisible();
    await authenticatedPage.getByLabel("단순 변심").click();
    await authenticatedPage
      .getByPlaceholder(/사유를 자세히 입력해주세요\./)
      .fill("E2E repair cancel claim");
    await authenticatedPage
      .getByRole("button", { name: "취소 신청하기" })
      .click();
    await expect(authenticatedPage).toHaveURL(/\/order\/claim-list$/);
  });

  // SC-repair-012: 고객 수선중 상태 취소 버튼 미노출
  test("수선중 상태 수선 주문에서 취소 요청 버튼이 표시되지 않는다 (SC-repair-012)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/order/${repairOrderAtInProgress.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage);
    await expect(
      authenticatedPage.getByRole("button", { name: "취소 요청" }),
    ).not.toBeVisible();
  });
});
