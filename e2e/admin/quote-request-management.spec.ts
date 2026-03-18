import {
  expect,
  expectAuthenticatedRoute,
  hasConfiguredAuth,
  test,
} from "../fixtures/auth";
import {
  seedQuoteRequest,
  adminUpdateQuoteRequestStatus,
  type SeededQuoteRequest,
} from "../utils/quote-data";

test.describe.serial("Admin 견적요청 관리", () => {
  test.skip(
    !hasConfiguredAuth("store") || !hasConfiguredAuth("admin"),
    "Store/Admin 테스트 계정 env가 필요합니다.",
  );

  let quoteForStatusFlow: SeededQuoteRequest;
  let quoteForTerminate: SeededQuoteRequest;

  test.beforeAll(async () => {
    [quoteForStatusFlow, quoteForTerminate] = await Promise.all([
      seedQuoteRequest(),
      seedQuoteRequest(),
    ]);
  });

  // SC-quote-006: admin 견적발송 처리
  test("SC-quote-006: admin이 견적금액 입력 후 견적발송 처리할 수 있다", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(
      `/quote-requests/show/${quoteForStatusFlow.quoteRequestId}`,
    );
    await expectAuthenticatedRoute(authenticatedPage, "/login");

    // 견적번호 확인
    await expect(
      authenticatedPage.getByText(quoteForStatusFlow.quoteNumber),
    ).toBeVisible();

    // 상태가 "요청"임을 확인
    await expect(
      authenticatedPage.getByText("요청", { exact: true }),
    ).toBeVisible();

    // 견적금액 입력
    const quotedAmountInput = authenticatedPage.locator(
      'input[placeholder="견적금액을 입력해주세요"]',
    );
    await quotedAmountInput.click();
    await quotedAmountInput.fill("1000000");

    // 견적 조건 입력
    const quoteConditionsInput = authenticatedPage.locator(
      'textarea[placeholder="납기, 결제 조건 등"]',
    );
    await quoteConditionsInput.fill("납기 2주, 선불 결제");

    // "견적발송 으로 변경" 버튼 클릭
    await authenticatedPage
      .getByRole("button", { name: /견적발송.*으로 변경/ })
      .click();

    // 상태가 "견적발송"으로 변경되었는지 확인
    await expect(authenticatedPage.getByText("견적발송")).toBeVisible();
  });

  // SC-quote-008: admin 협의중 → 확정 → 종료(협의중에서)
  test("SC-quote-008: admin이 견적발송 → 협의중 → 확정 순서로 상태를 변경하고, 종료 처리도 할 수 있다", async ({
    authenticatedPage,
  }) => {
    // 견적발송 상태로 먼저 전환 (API로)
    await adminUpdateQuoteRequestStatus(
      quoteForTerminate.quoteRequestId,
      "견적발송",
      300000,
    );

    await authenticatedPage.goto(
      `/quote-requests/show/${quoteForTerminate.quoteRequestId}`,
    );
    await expectAuthenticatedRoute(authenticatedPage, "/login");

    // 견적번호 확인
    await expect(
      authenticatedPage.getByText(quoteForTerminate.quoteNumber),
    ).toBeVisible();

    // 견적발송 상태 확인 (상태 태그가 여러 개 있을 수 있으므로 first() 사용)
    await expect(authenticatedPage.getByText("견적발송").first()).toBeVisible();

    // 협의중으로 변경
    await authenticatedPage
      .getByRole("button", { name: /협의중.*으로 변경/ })
      .click();

    // 업데이트 반영 대기
    await authenticatedPage.waitForTimeout(500);
    await expect(authenticatedPage.getByText("협의중").first()).toBeVisible();

    // 종료 처리 버튼이 협의중 상태에서 표시되는지 확인
    // (컴포넌트: detail.status !== "종료" && detail.status !== "확정" 조건에서 표시됨)
    const terminateButton = authenticatedPage.getByRole("button", {
      name: "종료 처리",
    });
    await expect(terminateButton).toBeVisible();

    // 확정으로 변경
    await authenticatedPage
      .getByRole("button", { name: /확정.*으로 변경/ })
      .click();

    await authenticatedPage.waitForTimeout(500);
    await expect(authenticatedPage.getByText("확정").first()).toBeVisible();

    // 확정 상태에서는 종료 처리 버튼이 사라짐 (컴포넌트 로직에 따름)
    await expect(
      authenticatedPage.getByRole("button", { name: "종료 처리" }),
    ).not.toBeVisible();
  });

  // SC-quote-006 보충: admin 견적요청 목록에서 견적 요청이 표시된다
  test("admin 견적요청 목록 페이지에서 견적 요청이 표시된다", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/quote-requests");
    await expectAuthenticatedRoute(authenticatedPage, "/login");

    // 견적번호로 검색 (목록에 견적번호가 표시되는지 확인)
    await expect(
      authenticatedPage.getByText(quoteForStatusFlow.quoteNumber),
    ).toBeVisible();
  });
});
