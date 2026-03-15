import type { Page } from "@playwright/test";
import {
  expect,
  expectAuthenticatedRoute,
  hasConfiguredAuth,
  test,
} from "../fixtures/auth";
import { createStoreClaim, seedClaimOrders } from "../utils/store-data";
import { claimCard } from "../utils/claim-helpers";

type SeededClaimOrders = Awaited<ReturnType<typeof seedClaimOrders>>;

const submitClaimForm = async ({
  page,
  claimTypeLabel,
  reasonLabel,
  description,
}: {
  page: Page;
  claimTypeLabel: string;
  reasonLabel: string;
  description: string;
}) => {
  await expect(
    page.getByText(`${claimTypeLabel} 신청`, { exact: true }),
  ).toBeVisible();
  await page.getByLabel(reasonLabel).click();
  await page.getByPlaceholder(/사유를 자세히 입력해주세요\./).fill(description);
  await page
    .getByRole("button", { name: `${claimTypeLabel} 신청하기` })
    .click();
  await expect(page).toHaveURL(/\/order\/claim-list$/);
};

test.describe.serial("Store 클레임 플로우", () => {
  test.skip(
    !hasConfiguredAuth("store") || !hasConfiguredAuth("admin"),
    "Store/Admin 테스트 계정 env가 필요합니다.",
  );

  let claimOrders: SeededClaimOrders;

  test.beforeAll(async () => {
    claimOrders = await seedClaimOrders();
  });

  test("주문 상세에서 취소 신청 폼으로 이동해 취소를 접수한다", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/order/${claimOrders.cancelOrder.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage);

    await authenticatedPage.getByRole("button", { name: "취소 요청" }).click();
    await expect(authenticatedPage).toHaveURL(
      new RegExp(
        `/order/claim/cancel/${claimOrders.cancelOrder.orderId}/${claimOrders.cancelOrder.itemId}$`,
      ),
    );

    await submitClaimForm({
      page: authenticatedPage,
      claimTypeLabel: "취소",
      reasonLabel: "단순 변심",
      description: "E2E cancel claim",
    });

    const cancelCard = claimCard(
      authenticatedPage,
      claimOrders.cancelOrder.orderId,
      "취소",
    );
    await expect(cancelCard).toContainText("접수");
    await expect(cancelCard).toContainText(claimOrders.cancelOrder.orderNumber);
  });

  test("주문 상세에서 반품 신청 폼으로 이동해 반품을 접수한다", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/order/${claimOrders.returnOrder.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage);

    await authenticatedPage.getByRole("button", { name: "반품 요청" }).click();
    await expect(authenticatedPage).toHaveURL(
      new RegExp(
        `/order/claim/return/${claimOrders.returnOrder.orderId}/${claimOrders.returnOrder.itemId}$`,
      ),
    );

    await submitClaimForm({
      page: authenticatedPage,
      claimTypeLabel: "반품",
      reasonLabel: "상품 불량",
      description: "E2E return claim",
    });

    const returnCard = claimCard(
      authenticatedPage,
      claimOrders.returnOrder.orderId,
      "반품",
    );
    await expect(returnCard).toContainText("접수");
    await expect(returnCard).toContainText(claimOrders.returnOrder.orderNumber);
  });

  test("주문 상세에서 교환 신청 폼으로 이동해 교환을 접수한다", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/order/${claimOrders.exchangeOrder.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage);

    await authenticatedPage.getByRole("button", { name: "교환 요청" }).click();
    await expect(authenticatedPage).toHaveURL(
      new RegExp(
        `/order/claim/exchange/${claimOrders.exchangeOrder.orderId}/${claimOrders.exchangeOrder.itemId}$`,
      ),
    );

    await submitClaimForm({
      page: authenticatedPage,
      claimTypeLabel: "교환",
      reasonLabel: "사이즈 불일치",
      description: "E2E exchange claim",
    });

    const exchangeCard = claimCard(
      authenticatedPage,
      claimOrders.exchangeOrder.orderId,
      "교환",
    );
    await expect(exchangeCard).toContainText("접수");
    await expect(exchangeCard).toContainText(
      claimOrders.exchangeOrder.orderNumber,
    );
  });

  test("클레임 목록에서 접수 상태와 데이터를 확인한다", async ({
    authenticatedPage,
  }) => {
    const listVerificationOrders = await seedClaimOrders();

    await Promise.all([
      createStoreClaim({
        type: "cancel",
        orderId: listVerificationOrders.cancelOrder.orderId,
        itemId: listVerificationOrders.cancelOrder.itemId,
        reason: "change_mind",
        description: "E2E cancel claim list verification",
      }),
      createStoreClaim({
        type: "return",
        orderId: listVerificationOrders.returnOrder.orderId,
        itemId: listVerificationOrders.returnOrder.itemId,
        reason: "defect",
        description: "E2E return claim list verification",
      }),
      createStoreClaim({
        type: "exchange",
        orderId: listVerificationOrders.exchangeOrder.orderId,
        itemId: listVerificationOrders.exchangeOrder.itemId,
        reason: "size_mismatch",
        description: "E2E exchange claim list verification",
      }),
    ]);

    await authenticatedPage.goto("/order/claim-list");
    await expectAuthenticatedRoute(authenticatedPage);

    const cancelCard = claimCard(
      authenticatedPage,
      listVerificationOrders.cancelOrder.orderId,
      "취소",
    );
    const returnCard = claimCard(
      authenticatedPage,
      listVerificationOrders.returnOrder.orderId,
      "반품",
    );
    const exchangeCard = claimCard(
      authenticatedPage,
      listVerificationOrders.exchangeOrder.orderId,
      "교환",
    );

    await expect(cancelCard).toContainText(
      listVerificationOrders.cancelOrder.orderNumber,
    );
    await expect(cancelCard).toContainText("취소");
    await expect(cancelCard).toContainText("접수");
    await expect(cancelCard).toContainText("change_mind");

    await expect(returnCard).toContainText(
      listVerificationOrders.returnOrder.orderNumber,
    );
    await expect(returnCard).toContainText("반품");
    await expect(returnCard).toContainText("접수");
    await expect(returnCard).toContainText("defect");

    await expect(exchangeCard).toContainText(
      listVerificationOrders.exchangeOrder.orderNumber,
    );
    await expect(exchangeCard).toContainText("교환");
    await expect(exchangeCard).toContainText("접수");
    await expect(exchangeCard).toContainText("size_mismatch");

    await expect(cancelCard).toContainText(
      listVerificationOrders.cancelOrder.productName,
    );
    await expect(returnCard).toContainText(
      listVerificationOrders.returnOrder.productName,
    );
    await expect(exchangeCard).toContainText(
      listVerificationOrders.exchangeOrder.productName,
    );
  });
});
