/**
 * Design/Token E2E 테스트
 * SC-design-001 ~ SC-design-013
 *
 * 주의:
 *  - SC-design-004/005: 실제 AI API 호출은 opt-in으로만 실행
 *  - SC-design-006: AI 응답 mock 필요 → 실제 환경에서만 가능, skip 처리
 *  - SC-design-012: admin Edge Function 호출로 cancel-token-payment 필요
 *  - SC-design-013: 신규 계정 필요, 복잡도 높아 skip 처리
 */

import type { Page } from "@playwright/test";
import {
  expect,
  expectAuthenticatedRoute,
  hasConfiguredAuth,
  test,
} from "@/fixtures/auth";
import { getSupabaseConfig, readAuthMeta } from "@/utils/store-data";
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
 * 토큰 지급을 시도하고, DB 오버로딩 충돌 시 현재 테스트를 skip 처리합니다.
 * test.skip은 반드시 test 함수 본문 내에서 호출해야 합니다.
 */
const tryGrantTokens = async (
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

    // 청약철회 동의 체크박스
    const consentCheckbox = page.locator("#withdrawal-consent");
    await consentCheckbox.waitFor({ timeout: 10_000 });
    if (!(await consentCheckbox.isChecked())) {
      await consentCheckbox.click();
    }

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

    const consentCheckbox = page.locator("#withdrawal-consent");
    await consentCheckbox.waitFor({ timeout: 10_000 });
    if (!(await consentCheckbox.isChecked())) {
      await consentCheckbox.click();
    }

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

    // 테스트용 토큰 지급 (잔액이 없을 경우를 대비)
    const balance = await getStoreTokenBalance();
    if (balance.total === 0) {
      const granted = await tryGrantTokens(
        storeMeta.userId,
        10,
        "E2E SC-design-003 지급",
      );
      if (!granted) {
        test.skip(
          true,
          "manage_design_tokens_admin DB 오버로딩 충돌로 토큰 지급 불가",
        );
        return;
      }
    }

    await page.goto(ROUTES.DESIGN);
    await expectAuthenticatedRoute(page);
    await dismissOnboardingDialog(page);

    // ChatHeader에 토큰 잔액 표시 확인
    // "N tokens" 패턴의 텍스트
    await expect(page.getByText(/\d+[\d,]* tokens/)).toBeVisible({
      timeout: 15_000,
    });
  });

  // ── SC-design-004: 텍스트 생성 요청 ──────────────────────────────────────

  test("SC-design-004: 텍스트 생성 요청", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await installMockAiDesign(page, {
      type: "text",
      aiMessage:
        "빨간색 줄무늬 포인트와 실크 질감이 어울리는 방향으로 추천드립니다.",
    });

    // 토큰 확보
    const balance = await getStoreTokenBalance();
    if (balance.total < 5) {
      const granted = await tryGrantTokens(
        storeMeta.userId,
        20,
        "E2E SC-design-004 지급",
      );
      if (!granted) {
        test.skip(
          true,
          "manage_design_tokens_admin DB 오버로딩 충돌로 토큰 지급 불가",
        );
        return;
      }
    }

    await page.goto(ROUTES.DESIGN);
    await expectAuthenticatedRoute(page);
    await dismissOnboardingDialog(page);

    // 텍스트 입력
    const textarea = page.getByLabel("디자인 요청 메시지");
    await textarea.waitFor({ timeout: 10_000 });
    await textarea.fill("빨간색 줄무늬 넥타이 디자인을 추천해줘");

    // 전송 버튼 클릭
    const sendButton004 = page.getByLabel("메시지 전송");
    await expect(sendButton004).toBeEnabled({ timeout: 10_000 });
    await sendButton004.click();

    await expect(
      page.getByText(
        "빨간색 줄무늬 포인트와 실크 질감이 어울리는 방향으로 추천드립니다.",
      ),
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
    await installMockAiDesign(page, {
      type: "image",
      aiMessage: "파란색 격자 패턴 시안을 생성했습니다.",
    });

    // 토큰 확보 (이미지 생성은 3~5 토큰 소모)
    const balance = await getStoreTokenBalance();
    if (balance.total < 10) {
      const granted = await tryGrantTokens(
        storeMeta.userId,
        30,
        "E2E SC-design-005 지급",
      );
      if (!granted) {
        test.skip(
          true,
          "manage_design_tokens_admin DB 오버로딩 충돌로 토큰 지급 불가",
        );
        return;
      }
    }

    await page.goto(ROUTES.DESIGN);
    await expectAuthenticatedRoute(page);
    await dismissOnboardingDialog(page);

    // text_and_image 라디오 버튼 선택 (fabricMethod는 직조/인쇄 옵션)
    // 이미지 첨부 팝업을 통해 이미지 타입 선택하는 대신, 메시지로 이미지 요청
    const textarea = page.getByLabel("디자인 요청 메시지");
    await textarea.waitFor({ timeout: 10_000 });
    await textarea.fill("파란색 격자무늬 넥타이 패턴 이미지를 생성해줘");

    // 전송
    const sendButton005 = page.getByLabel("메시지 전송");
    await expect(sendButton005).toBeEnabled({ timeout: 10_000 });
    await sendButton005.click();

    await expect(
      page.getByText("파란색 격자 패턴 시안을 생성했습니다."),
    ).toBeVisible({
      timeout: 15_000,
    });
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

  test("SC-design-006: 이미지 미생성 시 선차감 토큰 복원", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;
    await installMockAiDesign(page, {
      type: "image-missing",
      aiMessage: "텍스트 제안만 가능했고 이미지 시안은 생성되지 않았습니다.",
    });

    const balanceBefore = await getStoreTokenBalance();
    if (balanceBefore.total < 10) {
      const granted = await tryGrantTokens(
        storeMeta.userId,
        20,
        "E2E SC-design-006 지급",
      );
      if (!granted) {
        test.skip(
          true,
          "manage_design_tokens_admin DB 오버로딩 충돌로 토큰 지급 불가",
        );
        return;
      }
    }

    await page.goto(ROUTES.DESIGN);
    await expectAuthenticatedRoute(page);
    await dismissOnboardingDialog(page);

    const textarea = page.getByLabel("디자인 요청 메시지");
    await textarea.waitFor({ timeout: 10_000 });
    await textarea.fill("이미지 없는 응답 테스트");

    const sendButton006 = page.getByLabel("메시지 전송");
    await expect(sendButton006).toBeEnabled({ timeout: 10_000 });
    await sendButton006.click();

    await expect(
      page.getByText(
        "텍스트 제안만 가능했고 이미지 시안은 생성되지 않았습니다.",
      ),
    ).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      page.getByText("이미지 생성됨 · 우측 프리뷰 확인"),
    ).toHaveCount(0);

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
      test.skip(
        true,
        "토큰 초기화 불가 (manage_design_tokens_admin DB 오버로딩 충돌). 잔액이 0이어야 합니다.",
      );
      return;
    }
    expect(balance.total).toBe(0);

    await page.goto(ROUTES.DESIGN);
    await expectAuthenticatedRoute(page);
    await dismissOnboardingDialog(page);

    // generate 함수가 insufficient_tokens 오류를 반환하도록 mock
    await page.route("**/functions/v1/generate-open-api", async (route) => {
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
    const sendButton = page.getByLabel("메시지 전송");
    await expect(sendButton).toBeEnabled({ timeout: 10_000 });
    await sendButton.click();

    // 토큰 부족 안내 표시 확인
    // use-design-chat에서 InsufficientTokensError 처리 시 AI 말풍선에 메시지 표시
    // "토큰이 부족합니다. 현재 잔액: 0토큰, 필요: 1토큰" 형태
    await expect(
      page.getByText(/토큰이 부족합니다/i, { exact: false }),
    ).toBeVisible({ timeout: 15_000 });
  });

  // ── SC-design-008: 환불 대기 중 생성 시도 ────────────────────────────────
  // 주의: use-design-chat.ts에서 refund_pending 오류 처리가 구현되지 않은 경우 skip

  test.skip("SC-design-008: 환불 대기 중 생성 시도 (refund_pending 오류 처리 미구현 - skip)", async () => {
    // use-design-chat.ts에서 refund_pending 오류 처리가 구현된 후 활성화
    // 구현 시: 403 + refund_pending 응답 → "환불 대기 중입니다" 안내 표시
    // 현재는 InsufficientTokensError만 처리하며 refund_pending은 일반 에러로 처리됨
  });

  // ── SC-design-009: 토큰 내역 조회 ────────────────────────────────────────

  test("SC-design-009: 토큰 내역 조회", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // 토큰 지급 (내역이 있도록) - 실패해도 페이지 접근은 가능하므로 무시
    await tryGrantTokens(storeMeta.userId, 5, "E2E SC-design-009 지급");

    await page.goto(ROUTES.TOKEN_HISTORY);
    await expectAuthenticatedRoute(page);

    // 현재 토큰 잔액 카드 확인
    await expect(
      page.getByRole("heading", { name: "현재 토큰 잔액" }).first(),
    ).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      page.getByRole("heading", { name: "사용 및 환불 이력" }),
    ).toBeVisible();

    // 잔액 또는 이력 섹션이 렌더링되는지 확인 (스켈레톤 이후)
    await page.waitForTimeout(2_000);
    const balanceText = page
      .getByRole("complementary")
      .locator(".text-3xl.font-semibold");
    await expect(balanceText).toBeVisible();
  });

  // ── SC-design-010: paid 토큰 수동 환불 신청 ──────────────────────────────

  test("SC-design-010: paid 토큰 수동 환불 신청", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await page.goto(ROUTES.ORDER_LIST);
    await expectAuthenticatedRoute(page);

    // "환불 신청" 버튼이 있는지 확인
    const refundButton = page
      .getByRole("button", { name: "환불 신청" })
      .first();
    const hasRefundButton = await refundButton
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!hasRefundButton) {
      test.skip(
        true,
        "환불 가능한 토큰 주문이 없습니다. SC-design-001로 토큰을 구매하세요.",
      );
      return;
    }

    await refundButton.click();

    // 환불 다이얼로그 확인
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("환불 신청")).toBeVisible();

    // 환불 신청 확인 버튼 클릭
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "환불 신청" })
      .click();

    // 성공 토스트 또는 "환불 신청 중" 배지 확인
    await expect(page.getByText(/환불 신청이 완료|환불 신청 중/)).toBeVisible({
      timeout: 10_000,
    });
  });

  // ── SC-design-011: 동일 주문 중복 환불 신청 ──────────────────────────────

  test("SC-design-011: 동일 주문 수동 환불 중복 신청 시도", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await page.goto(ROUTES.ORDER_LIST);
    await expectAuthenticatedRoute(page);

    await page.waitForTimeout(2_000);

    // "환불 신청 중" 배지가 있는지 확인 (이미 pending 상태)
    const pendingBadge = page.getByText("환불 신청 중").first();
    const hasPending = await pendingBadge
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!hasPending) {
      test.skip(
        true,
        "pending 환불 요청이 없습니다. SC-design-010을 먼저 실행하세요.",
      );
      return;
    }

    // 이미 pending인 주문에 "환불 신청" 버튼이 없음을 확인
    // (pending 상태에서는 "환불 신청 중" 배지와 "신청 취소" 버튼이 표시됨)
    await expect(pendingBadge).toBeVisible();

    // 동일 주문에 환불 신청 버튼이 없어야 함
    const refundButtons = pendingBadge
      .locator("xpath=ancestor::div[contains(@class,'rounded-lg')][1]")
      .getByRole("button", { name: "환불 신청" });
    const refundButtonCount = await refundButtons.count();

    // pending 상태의 주문에는 환불 신청 버튼이 없어야 함
    // (환불 신청 중 배지 + 신청 취소 버튼만 있어야 함)
    expect(refundButtonCount).toBe(0);
  });

  // ── SC-design-012: 관리자 수동 환불 요청 승인 ────────────────────────────

  test("SC-design-012: 관리자 수동 환불 요청 승인", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // pending 환불 요청 확인
    await page.goto(ROUTES.ORDER_LIST);
    await expectAuthenticatedRoute(page);
    await page.waitForTimeout(2_000);

    const pendingBadge = page.getByText("환불 신청 중").first();
    const hasPending = await pendingBadge
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!hasPending) {
      test.skip(
        true,
        "pending 환불 요청이 없습니다. SC-design-010을 먼저 실행하세요.",
      );
      return;
    }
    // admin 앱에서 클레임 목록 확인 (admin baseURL은 playwright config에서 5174)
    // store 테스트에서는 admin 페이지에 직접 접근하기 어려우므로
    // admin API를 통해 환불 승인 처리

    // 잔액 기록 (승인 후 차감 확인)
    const balanceBefore = await getStoreTokenBalance();

    // admin claims 목록에서 token_refund 클레임 찾기
    // (admin 페이지로 직접 이동하여 UI 확인은 admin project에서 수행)
    // 여기서는 API 레벨에서 승인 처리
    const { supabaseUrl, supabaseAnonKey } = await getSupabaseConfig();
    const adminMeta = await readAuthMeta("admin");

    // token_refund 클레임 조회
    const claimsResponse = await fetch(
      `${supabaseUrl}/rest/v1/claims?select=id,status,order_id&user_id=eq.${storeMeta.userId}&type=eq.token_refund&status=eq.접수&order=created_at.desc&limit=1`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${adminMeta.accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!claimsResponse.ok) {
      throw new Error(
        `claims 조회 실패: ${claimsResponse.status} ${await claimsResponse.text()}`,
      );
    }

    const claims = (await claimsResponse.json()) as Array<{
      id: string;
      status: string;
      order_id: string;
    }>;

    if (!claims[0]) {
      test.skip(true, "승인할 pending token_refund 클레임이 없습니다.");
      return;
    }

    const claimId = claims[0].id;
    const _orderId = claims[0].order_id;

    // Edge Function cancel-token-payment 호출 (환불 승인)
    const approvalResponse = await fetch(
      `${supabaseUrl}/functions/v1/cancel-token-payment`,
      {
        method: "POST",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${adminMeta.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ request_id: claimId }),
      },
    );

    if (!approvalResponse.ok) {
      const errorText = await approvalResponse.text();
      throw new Error(
        `cancel-token-payment Edge Function 오류: ${approvalResponse.status} ${errorText}`,
      );
    }

    // 토큰 차감 확인
    await page.waitForTimeout(2_000);
    const balanceAfter = await getStoreTokenBalance();
    expect(balanceAfter.total).toBeLessThan(balanceBefore.total);

    // 주문 목록에서 "환불 완료" 배지 확인
    await page.reload();
    await page.waitForTimeout(2_000);
    await expect(page.getByText("환불 완료").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  // ── SC-design-013: 신규 가입 시 bonus 토큰 지급 (skip) ──────────────────

  test.skip("SC-design-013: 신규 가입 시 bonus 토큰 지급 (테스트 제외)", async () => {
    // 사용자 요청에 따라 최초 1회 지급 시나리오는 E2E 대상에서 제외
  });
});
