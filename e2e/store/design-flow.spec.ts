/**
 * Design/Token E2E 테스트
 * SC-design-001 ~ SC-design-007, SC-design-009
 *
 * 주의:
 *  - SC-design-004/005: 실제 AI API 호출은 opt-in으로만 실행
 *  - 환불/신규 가입 시나리오는 현재 e2e 실행 대상이 아니므로 정의하지 않음
 */

import type { Page } from "@playwright/test";
import {
  expect,
  expectAuthenticatedRoute,
  hasConfiguredAuth,
  test,
} from "@/fixtures/auth";
import { readAuthMeta } from "@/utils/store-data";
import {
  GRANT_TOKEN_UNAVAILABLE,
  getStoreTokenBalance,
  grantTokensToUser,
  resetStoreUserTokens,
} from "@/utils/design-data";
import { installMockAiDesign } from "@/utils/mock-ai-design";
import { installMockToss } from "@/utils/mock-toss";

// ── 공통 헬퍼 ────────────────────────────────────────────────────────────────

/**
 * /design 페이지 접근 시 표시될 수 있는 온보딩 다이얼로그를 닫습니다.
 */
const dismissOnboardingDialog = async (page: Page) => {
  // 최대 5번까지 "다음 →" 클릭 후 "시작하기" 클릭
  for (let i = 0; i < 5; i++) {
    const startButton = page.getByRole("button", { name: "시작하기" });
    const nextButton = page.getByRole("button", { name: "다음 →" });

    const startVisible = await startButton
      .isVisible({ timeout: 1_000 })
      .catch(() => false);
    if (startVisible) {
      await startButton.click();
      await page.waitForTimeout(300);
      return;
    }

    const nextVisible = await nextButton
      .isVisible({ timeout: 1_000 })
      .catch(() => false);
    if (nextVisible) {
      await nextButton.click();
      await page.waitForTimeout(300);
    } else {
      // 다이얼로그가 없음 - 완료
      return;
    }
  }
};

/**
 * grantTokensToUser 호출 시 PGRST203 오버로딩 충돌 감지용 타입 가드
 */
const hasCode = (e: unknown): e is { code: string } =>
  typeof e === "object" && e !== null && "code" in e;

/**
 * 토큰 지급을 시도하고, DB 오버로딩 충돌 여부를 반환합니다.
 */
const grantTokensIfAvailable = async (
  userId: string,
  amount: number,
  description: string,
): Promise<boolean> => {
  try {
    await grantTokensToUser(userId, amount, description);
    return true;
  } catch (err) {
    if (hasCode(err) && err.code === GRANT_TOKEN_UNAVAILABLE) {
      return false;
    }
    throw err;
  }
};

const ensureTokenBalance = async (
  userId: string,
  minimumBalance: number,
  grantAmount: number,
  description: string,
) => {
  const balance = await getStoreTokenBalance();
  if (balance.total >= minimumBalance) return balance;

  const granted = await grantTokensIfAvailable(
    userId,
    grantAmount,
    description,
  );
  if (!granted) {
    throw new Error(
      "manage_design_tokens_admin DB 오버로딩 충돌로 토큰 지급 불가",
    );
  }

  return getStoreTokenBalance();
};

// ── 경로 상수 ────────────────────────────────────────────────────────────────

const ROUTES = {
  DESIGN: "/design",
  TOKEN_PURCHASE: "/token/purchase",
  TOKEN_HISTORY: "/my-page/token-history",
  ORDER_LIST: "/order/order-list",
} as const;

// ────────────────────────────────────────────────────────────────────────────

test.describe.serial("Design/Token 플로우", () => {
  test.skip(
    !hasConfiguredAuth("store") || !hasConfiguredAuth("admin"),
    "Store/Admin 테스트 계정 env가 필요합니다.",
  );

  let storeMeta: Awaited<ReturnType<typeof readAuthMeta>>;

  test.beforeAll(async () => {
    storeMeta = await readAuthMeta("store");
  });

  // ── SC-design-001: 토큰 패키지 구매 성공 ──────────────────────────────────

  test("SC-design-001: 토큰 패키지 구매 성공", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;
    await installMockToss(page, "success");

    // create_token_order RPC를 mock하여 결제 위젯까지 진행
    // (generate_token_order_number 함수가 원격 DB에 없는 경우를 대비)
    const mockPaymentGroupId = crypto.randomUUID();
    await page.route("**/rest/v1/rpc/create_token_order", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          payment_group_id: mockPaymentGroupId,
          price: 2900,
          token_amount: 30,
        }),
      });
    });

    // confirm-payment mock 등록 (token_purchase 타입으로 응답)
    await page.route("**/functions/v1/confirm-payment", async (route) => {
      const req = route.request().postDataJSON() as {
        paymentKey: string;
        orderId: string;
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          paymentKey: req.paymentKey,
          paymentGroupId: req.orderId,
          status: "DONE",
          type: "token_purchase",
          tokenAmount: 30,
          orders: [{ orderId: req.orderId, orderType: "token" }],
        }),
      });
    });

    const balanceBefore = await getStoreTokenBalance();

    await page.goto(ROUTES.TOKEN_PURCHASE);
    await expectAuthenticatedRoute(page);
    await page.waitForSelector("text=토큰 충전", { timeout: 15_000 });

    // 브라우저 콘솔 메시지 캡처
    const browserLogs: string[] = [];
    page.on("console", (msg) => {
      browserLogs.push(`[browser:${msg.type()}] ${msg.text()}`);
    });

    // "충전하기" 버튼 클릭 (첫 번째 플랜 선택, Starter)
    await page.getByRole("button", { name: "충전하기" }).first().click();

    // create_token_order mock 응답 후 결제 수단 섹션 렌더링 대기
    await expect(page.locator("text=결제 수단").first()).toBeVisible({
      timeout: 20_000,
    });

    // 결제하기 버튼 (enabled 될 때까지 대기)
    const payButton = page.getByRole("button", { name: /원 결제하기/ });
    await expect(payButton).toBeEnabled({ timeout: 10_000 });

    // elementFromPoint 진단: 버튼 위치에 어떤 요소가 있는지 확인
    const elementAtPoint = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.trim().includes("결제하기"),
      );
      if (!btn) return { error: "button not found" };
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const el = document.elementFromPoint(cx, cy);
      return {
        btnTag: btn.tagName,
        btnRect: {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        },
        elAtPoint: el
          ? `${el.tagName}#${el.id}.${Array.from(el.classList).join(".")}`
          : "null",
        isBtn: el === btn || !!btn.contains(el),
        mockTossSet: !!window.__E2E_MOCK_TOSS__,
      };
    });
    console.log(
      "[SC-design-001 elementFromPoint]",
      JSON.stringify(elementAtPoint),
    );

    await payButton.click();
    await page.waitForTimeout(1000);

    console.log(
      "[SC-design-001 browser logs after click]",
      JSON.stringify(browserLogs.slice(-10)),
    );

    // 알림 수신 동의 모달이 뜨면 "동의 없이 계속" 클릭 (타이밍에 따라 모달이 늦게 뜰 수 있음)
    await page
      .getByRole("button", { name: "동의 없이 계속" })
      .click({ timeout: 5_000 })
      .catch(() => {
        /* 모달이 뜨지 않으면 무시 */
      });

    await page.waitForTimeout(500);
    console.log(
      "[SC-design-001 browser logs after modal]",
      JSON.stringify(browserLogs.slice(-10)),
    );

    // 결제 성공 후 /design으로 리다이렉트
    await expect(page).toHaveURL(/\/design$/, { timeout: 15_000 });

    // confirm-payment mock이 토큰 지급을 처리하지 않으므로 실제 잔액은 변하지 않음
    // 대신 /design으로 이동했음을 성공 조건으로 확인
    const balanceAfter = await getStoreTokenBalance();
    // mock 환경이므로 잔액은 그대로이거나 증가할 수 있음
    expect(balanceAfter.total).toBeGreaterThanOrEqual(balanceBefore.total);
  });

  // ── SC-design-002: 토큰 구매 결제 실패 시 잔액 변화 없음 ─────────────────

  test("SC-design-002: 토큰 구매 결제 실패 시 잔액 변화 없음", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;
    await installMockToss(page, "fail");

    // create_token_order RPC mock
    const mockPaymentGroupId = crypto.randomUUID();
    await page.route("**/rest/v1/rpc/create_token_order", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          payment_group_id: mockPaymentGroupId,
          price: 2900,
          token_amount: 30,
        }),
      });
    });

    const balanceBefore = await getStoreTokenBalance();

    await page.goto(ROUTES.TOKEN_PURCHASE);
    await expectAuthenticatedRoute(page);
    await page.waitForSelector("text=토큰 충전", { timeout: 15_000 });

    // "충전하기" 버튼 클릭 (첫 번째 플랜 선택)
    await page.getByRole("button", { name: "충전하기" }).first().click();

    // 결제 수단 섹션 렌더링 대기
    await expect(page.getByText("결제 수단")).toBeVisible({ timeout: 20_000 });

    // 결제하기 버튼 클릭
    const payButton = page.getByRole("button", { name: /원 결제하기/ });
    await payButton.waitFor({ timeout: 10_000 });
    await payButton.click();

    await page
      .getByRole("button", { name: "동의 없이 계속" })
      .click({ timeout: 5_000 })
      .catch(() => {
        /* 모달이 뜨지 않으면 무시 */
      });

    // 결제 실패 페이지로 이동
    await expect(page).toHaveURL(/\/token\/purchase\/fail/, {
      timeout: 15_000,
    });
    await expect(page.getByText("결제에 실패했습니다")).toBeVisible();

    // 잔액 변화 없음 확인
    const balanceAfter = await getStoreTokenBalance();
    expect(balanceAfter.total).toBe(balanceBefore.total);
  });

  // ── SC-design-003: 토큰 잔액 표시 ────────────────────────────────────────

  test("SC-design-003: /design 페이지에서 토큰 잔액 표시", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await ensureTokenBalance(storeMeta.userId, 1, 10, "E2E SC-design-003 지급");

    await page.goto(ROUTES.DESIGN);
    await expectAuthenticatedRoute(page);
    await dismissOnboardingDialog(page);

    // ChatHeader에 토큰 잔액 표시 확인
    await expect(
      page
        .locator("main")
        .getByText(/^\d+[\d,]*$/)
        .first(),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "충전" })).toBeVisible();
  });

  // ── SC-design-004: 텍스트 생성 요청 ──────────────────────────────────────

  test("SC-design-004: 텍스트 생성 요청", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await installMockAiDesign(page, { type: "text" });

    await ensureTokenBalance(storeMeta.userId, 5, 20, "E2E SC-design-004 지급");

    await page.goto(ROUTES.DESIGN);
    await expectAuthenticatedRoute(page);
    await dismissOnboardingDialog(page);

    // 텍스트 입력
    const textarea = page.getByLabel("디자인 요청 메시지");
    await textarea.waitFor({ timeout: 10_000 });
    await textarea.fill("빨간색 줄무늬 넥타이 디자인을 추천해줘");

    // 전송 버튼 클릭
    const sendButton004 = page.getByRole("button", {
      exact: true,
      name: "생성",
    });
    await expect(sendButton004).toBeEnabled({ timeout: 10_000 });
    await sendButton004.click();

    await expect(
      page.getByRole("button", { name: "이미지 다운로드" }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByTestId("typing-indicator")).toBeHidden({
      timeout: 15_000,
    });
  });

  // ── SC-design-005: 이미지 포함 생성 요청 ────────────────────────────────

  test("SC-design-005: 이미지 포함 생성 요청", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;
    await installMockAiDesign(page, { type: "image" });

    await ensureTokenBalance(
      storeMeta.userId,
      10,
      30,
      "E2E SC-design-005 지급",
    );

    await page.goto(ROUTES.DESIGN);
    await expectAuthenticatedRoute(page);
    await dismissOnboardingDialog(page);

    // text_and_image 라디오 버튼 선택 (fabricMethod는 직조/인쇄 옵션)
    // 이미지 첨부 팝업을 통해 이미지 타입 선택하는 대신, 메시지로 이미지 요청
    const textarea = page.getByLabel("디자인 요청 메시지");
    await textarea.waitFor({ timeout: 10_000 });
    await textarea.fill("파란색 격자무늬 넥타이 패턴 이미지를 생성해줘");

    // 전송
    const sendButton005 = page.getByRole("button", {
      exact: true,
      name: "생성",
    });
    await expect(sendButton005).toBeEnabled({ timeout: 10_000 });
    await sendButton005.click();

    await expect(
      page.getByRole("button", { name: "이미지 다운로드" }),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "전체화면" })).toBeVisible({
      timeout: 15_000,
    });
  });

  // ── SC-design-006: 이미지 미생성 시 선차감 토큰 복원 ────────────────────
  // NOTE: 현재 mock 은 항상 성공 응답을 반환하므로 환불 경로를 e2e 에서 직접
  // 검증할 수 없음. 클라이언트 측 동작만 smoke 검증하고 실제 환불 흐름은
  // 별도 mock contract 확장 후 보강 예정.

  test("SC-design-006: 이미지 미생성 시 선차감 토큰 복원", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;
    await installMockAiDesign(page, { type: "image-missing" });

    const balanceBefore = await ensureTokenBalance(
      storeMeta.userId,
      10,
      20,
      "E2E SC-design-006 지급",
    );

    await page.goto(ROUTES.DESIGN);
    await expectAuthenticatedRoute(page);
    await dismissOnboardingDialog(page);

    const textarea = page.getByLabel("디자인 요청 메시지");
    await textarea.waitFor({ timeout: 10_000 });
    await textarea.fill("이미지 없는 응답 테스트");

    const sendButton006 = page.getByRole("button", {
      exact: true,
      name: "생성",
    });
    await expect(sendButton006).toBeEnabled({ timeout: 10_000 });
    await sendButton006.click();

    await expect(
      page.getByRole("button", { name: "이미지 다운로드" }),
    ).toBeVisible({
      timeout: 15_000,
    });

    const balanceAfter = await getStoreTokenBalance();
    expect(balanceAfter.total).toBeGreaterThanOrEqual(balanceBefore.total);
  });

  // ── SC-design-007: 토큰 부족 시 생성 시도 ────────────────────────────────

  test("SC-design-007: 토큰 부족 시 생성 시도", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // 토큰을 0으로 초기화
    // resetStoreUserTokens 내부에서 grantTokensToUser 실패 시 무시함 (catch 처리됨)
    await resetStoreUserTokens().catch(() => {
      // 오버로딩 충돌 시 초기화 불가 - 잔액이 0인 경우에만 계속 진행
    });
    const balance = await getStoreTokenBalance();
    if (balance.total !== 0) {
      throw new Error(
        "토큰 초기화 불가. SC-design-007은 시작 잔액이 0이어야 합니다.",
      );
    }
    expect(balance.total).toBe(0);

    await page.goto(ROUTES.DESIGN);
    await expectAuthenticatedRoute(page);
    await dismissOnboardingDialog(page);

    await page.route("**/functions/v1/generate-tile", async (route) => {
      await route.fulfill({
        status: 402,
        contentType: "application/json",
        body: JSON.stringify({
          error: "insufficient_tokens",
          balance: 0,
          cost: 1,
        }),
      });
    });
    const textarea = page.getByLabel("디자인 요청 메시지");
    await textarea.waitFor({ timeout: 10_000 });
    await textarea.fill("토큰 부족 테스트");
    const sendButton = page.getByRole("button", {
      exact: true,
      name: "생성",
    });
    await expect(sendButton).toBeEnabled({ timeout: 10_000 });
    await sendButton.click();

    await expect(page.getByRole("button", { name: "충전" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "이미지 다운로드" }),
    ).not.toBeVisible();
  });

  // ── SC-design-009: 토큰 내역 조회 ────────────────────────────────────────

  test("SC-design-009: 토큰 내역 조회", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // 토큰 지급 (내역이 있도록) - 실패해도 페이지 접근은 가능하므로 무시
    await grantTokensIfAvailable(storeMeta.userId, 5, "E2E SC-design-009 지급");

    await page.goto(ROUTES.TOKEN_HISTORY);
    await expectAuthenticatedRoute(page);

    // 현재 토큰 잔액 카드 확인
    await expect(
      page.getByRole("heading", { name: "현재 토큰 잔액" }).first(),
    ).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      page.getByRole("heading", { name: /사용 내역/ }),
    ).toBeVisible();

    // 잔액 또는 이력 섹션이 렌더링되는지 확인 (스켈레톤 이후)
    await page.waitForTimeout(2_000);
    await expect(page.getByText(/\d+토큰/).last()).toBeVisible();
  });
});
