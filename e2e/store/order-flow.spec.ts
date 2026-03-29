import type { Page } from "@playwright/test";
import {
  expect,
  expectAuthenticatedRoute,
  hasConfiguredAuth,
  test,
} from "@/fixtures/auth";
import {
  type CreateOrderResult,
  readFixtures,
  resetStoreCart,
  seedSaleOrder,
  seedShippingOrder,
} from "@/utils/store-data";
import { installMockToss } from "@/utils/mock-toss";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function requireCreateOrderResult(
  createOrderResult: CreateOrderResult | null,
): CreateOrderResult {
  if (!createOrderResult) {
    throw new Error("create-order 응답을 아직 캡처하지 못했습니다.");
  }

  if (
    !Array.isArray(createOrderResult.orders) ||
    createOrderResult.orders.length === 0
  ) {
    throw new Error("create-order 응답의 orders is missing or empty");
  }

  return createOrderResult;
}

const expectOrderDetailUrl = async (page: Page, orderId: string | null) => {
  if (!orderId) {
    throw new Error("Order ID is required to verify the order detail URL.");
  }

  await expect(page).toHaveURL(new RegExp(`/order/${escapeRegExp(orderId)}$`));
};

const addProductToCart = async (page: Page, productId: number) => {
  await page.goto(`/shop/${productId}`);
  await expectAuthenticatedRoute(page);
  await page.getByTestId("product-add-to-cart").click();
  await expect(page.getByText("장바구니에 추가되었습니다.")).toBeVisible();
  await page.getByRole("button", { name: "닫기" }).click();
  await page.goto("/cart");
};

const openOrderFormFromCart = async (page: Page) => {
  await page.goto("/cart");
  await page.locator('[data-testid^="cart-item-checkbox-"]').first().click();
  await expect(page.getByTestId("cart-order-button")).toBeEnabled();
  await page.getByTestId("cart-order-button").click();
  await expect(page).toHaveURL(/\/order\/order-form$/);
};

test.describe.serial("Store 주문 플로우", () => {
  test.skip(
    !hasConfiguredAuth("store") || !hasConfiguredAuth("admin"),
    "Store/Admin 테스트 계정 env가 필요합니다.",
  );

  let fixtures: Awaited<ReturnType<typeof readFixtures>>;
  let latestOrderId: string | null = null;
  let shippingOrderForTest: Awaited<ReturnType<typeof seedShippingOrder>>;
  let deliveredOrderForTest: Awaited<ReturnType<typeof seedSaleOrder>>;

  test.beforeAll(async () => {
    fixtures = await readFixtures();
    shippingOrderForTest = await seedShippingOrder();
    deliveredOrderForTest = await seedSaleOrder({ delivered: true });
  });

  test.beforeEach(async () => {
    await resetStoreCart();
  });

  test("상품 → 장바구니 담기", async ({ authenticatedPage }) => {
    await addProductToCart(authenticatedPage, fixtures.storeProduct.id);

    await expect(
      authenticatedPage.getByTestId("cart-items-panel"),
    ).toContainText(fixtures.storeProduct.name);
    await expect(
      authenticatedPage.getByTestId("cart-items-panel"),
    ).toContainText("FREE / 1개");
  });

  test("장바구니 수정", async ({ authenticatedPage }) => {
    await addProductToCart(authenticatedPage, fixtures.storeProduct.id);

    await authenticatedPage
      .locator('[data-testid^="cart-item-change-option-"]')
      .first()
      .click();
    const quantityInput = authenticatedPage
      .locator('input[type="number"]')
      .first();
    await quantityInput.fill("2");
    await quantityInput.blur();
    await authenticatedPage.getByRole("button", { name: "변경" }).click();
    await authenticatedPage.getByTestId("cart-select-all").click();

    await expect(
      authenticatedPage.getByTestId("cart-order-summary"),
    ).toContainText("총 2개");

    await expect(
      authenticatedPage.getByTestId("cart-remove-selected"),
    ).toBeEnabled();
    await authenticatedPage.getByTestId("cart-remove-selected").click();
    await authenticatedPage.getByRole("button", { name: "확인" }).click();

    await expect(
      authenticatedPage.locator('[data-testid^="cart-item-"]'),
    ).toHaveCount(0);
  });

  test("쿠폰 적용", async ({ authenticatedPage }) => {
    await addProductToCart(authenticatedPage, fixtures.storeProduct.id);
    await authenticatedPage.getByTestId("cart-select-all").click();

    await authenticatedPage
      .locator('[data-testid^="cart-item-change-coupon-"]')
      .first()
      .click();
    await authenticatedPage.getByText(fixtures.coupon.name).click();
    await authenticatedPage.getByRole("button", { name: "적용" }).click();

    await expect(
      authenticatedPage.getByTestId("cart-items-panel"),
    ).toContainText(`${fixtures.coupon.name} 적용`);
    await expect(
      authenticatedPage.getByTestId("cart-items-panel"),
    ).toContainText(
      `${(
        fixtures.storeProduct.price - fixtures.coupon.discountValue
      ).toLocaleString()}원`,
    );
  });

  test("주문서 작성", async ({ authenticatedPage }) => {
    await addProductToCart(authenticatedPage, fixtures.storeProduct.id);
    await openOrderFormFromCart(authenticatedPage);

    await expect(
      authenticatedPage.getByRole("heading", { name: "주문 상품 1개" }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByTestId("order-shipping-card"),
    ).toContainText(fixtures.shippingAddress.recipientName);
    await expect(
      authenticatedPage.getByTestId("order-items-card"),
    ).toContainText(fixtures.storeProduct.name);
    await expect(
      authenticatedPage.getByTestId("order-submit-button"),
    ).toBeEnabled();
  });

  test("결제 성공 (mock)", async ({ authenticatedPage }) => {
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
        const capturedOrderResult = requireCreateOrderResult(createOrderResult);

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            paymentKey: request.paymentKey,
            paymentGroupId: request.orderId,
            status: "DONE",
            orders: capturedOrderResult.orders.map((order) => ({
              orderId: order.order_id,
              orderType: order.order_type,
            })),
          }),
        });
      },
    );

    await addProductToCart(authenticatedPage, fixtures.storeProduct.id);
    await openOrderFormFromCart(authenticatedPage);
    await authenticatedPage.getByTestId("order-submit-button").click();
    await authenticatedPage
      .getByRole("button", { name: "동의 없이 계속" })
      .click({ timeout: 5_000 })
      .catch(() => {
        /* 모달이 뜨지 않으면 무시 */
      });

    await expect
      .poll(() => createOrderResult?.orders[0]?.order_id ?? null)
      .not.toBeNull();
    const completedOrderResult = requireCreateOrderResult(createOrderResult);
    latestOrderId = completedOrderResult?.orders[0]?.order_id ?? null;

    await expectOrderDetailUrl(authenticatedPage, latestOrderId);
    await expect(
      authenticatedPage.getByTestId("order-detail-root"),
    ).toContainText(fixtures.storeProduct.name);
  });

  test("결제 실패 (mock)", async ({ authenticatedPage }) => {
    await installMockToss(authenticatedPage, "fail");

    await authenticatedPage.route(
      "**/functions/v1/create-order",
      async (route) => {
        const response = await route.fetch();
        await route.fulfill({ response });
      },
    );

    await addProductToCart(authenticatedPage, fixtures.storeProduct.id);
    await openOrderFormFromCart(authenticatedPage);
    await authenticatedPage.getByTestId("order-submit-button").click();
    await authenticatedPage
      .getByRole("button", { name: "동의 없이 계속" })
      .click({ timeout: 5_000 })
      .catch(() => {
        /* 모달이 뜨지 않으면 무시 */
      });

    await expect(authenticatedPage).toHaveURL(/\/order\/payment\/fail/);
    await expect(
      authenticatedPage.getByText("결제에 실패했습니다"),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("button", { name: "주문서로 돌아가기" }),
    ).toBeVisible();
  });

  test("배송중 상태에서 취소 버튼이 표시되지 않는다 (SC-sale-019)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/order/${shippingOrderForTest.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage);
    await expect(
      authenticatedPage.getByTestId("order-detail-root"),
    ).toContainText(shippingOrderForTest.orderNumber);
    await expect(
      authenticatedPage.getByRole("button", { name: /취소/ }),
    ).not.toBeVisible();
  });

  test("배송완료 상태에서 구매확정하면 완료로 전환된다 (SC-sale-022)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/order/${deliveredOrderForTest.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage);
    const orderDetailRoot = authenticatedPage.getByTestId("order-detail-root");

    await expect(orderDetailRoot).toContainText(
      deliveredOrderForTest.orderNumber,
    );
    await authenticatedPage.getByRole("button", { name: "구매확정" }).click();
    await expect(
      orderDetailRoot.getByText("완료", { exact: true }),
    ).toBeVisible();
  });

  test("상품 상세에서 바로구매 클릭 시 주문서로 이동한다 (SC-sale-023)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/shop/${fixtures.storeProduct.id}`);
    await expectAuthenticatedRoute(authenticatedPage);
    await authenticatedPage.getByTestId("product-order-now").click();
    await expect(authenticatedPage).toHaveURL(/\/order\/order-form$/);
    await expect(
      authenticatedPage.getByRole("heading", { name: "주문 상품 1개" }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByTestId("order-items-card"),
    ).toContainText(fixtures.storeProduct.name);
  });

  test("주문 목록/상세 조회", async ({ authenticatedPage }) => {
    test.skip(!latestOrderId, "성공 주문 ID가 아직 없습니다.");

    await authenticatedPage.goto("/order/order-list");
    await expectAuthenticatedRoute(authenticatedPage);

    await expect(
      authenticatedPage.getByTestId(`order-card-${latestOrderId}`),
    ).toBeVisible();

    await authenticatedPage
      .locator(`[data-testid^="order-item-link-${latestOrderId}-"]`)
      .first()
      .click();

    await expectOrderDetailUrl(authenticatedPage, latestOrderId);
    await expect(
      authenticatedPage.getByTestId("order-detail-root"),
    ).toContainText(fixtures.storeProduct.name);
  });
});
