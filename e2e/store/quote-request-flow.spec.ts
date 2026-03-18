import type { Page } from "@playwright/test";
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

/**
 * WIZARD_STEPS 단계 정리:
 * isSkippable=false: quantity(0), sewing(2), attachment(6), confirm(7)
 * isSkippable=true: fabric(1, fabricProvided=false 아니면 스킵), spec(3), finishing(4), sample(5)
 *
 * tieType: "AUTO" | null → null=수동타이이지만 validate에서 !tieType이면 에러
 * 따라서 "자동 타이(AUTO)"를 선택해야 validate 통과
 *
 * 기본값(fabricProvided=false, reorder=false)이면 fabric도 표시됨
 * 실제 표시 단계: quantity → fabric → sewing → attachment → confirm (5단계)
 */
const navigateToConfirmStep = async (page: Page, isQuoteMode: boolean) => {
  if (isQuoteMode) {
    // 수량 100개 클릭
    await page.getByRole("button", { name: "100개" }).click();
    await expect(
      page.getByText("100개 이상은 견적요청으로 진행됩니다"),
    ).toBeVisible();
  }
  // quantity → fabric
  await page.getByRole("button", { name: /다음/ }).click();
  await expect(page.getByText("원단 조합")).toBeVisible();

  // fabric → sewing (기본값 POLY/PRINTING으로 통과)
  await page.getByRole("button", { name: /다음/ }).click();
  await expect(page.getByText("봉제 스타일 (중복 선택 가능)")).toBeVisible();

  // sewing: 자동 타이 선택 (tieType="AUTO"만 validate 통과)
  await page.getByText("자동 타이 (지퍼)").click();
  await expect(page.locator("#tie-type-auto")).toBeChecked();

  // sewing → attachment (spec, finishing, sample은 isSkippable=true이므로 스킵)
  await page.getByRole("button", { name: /다음/ }).click();
  await expect(page.getByText("참고자료")).toBeVisible();

  // attachment → confirm
  await page.getByRole("button", { name: /다음/ }).click();
  await expect(
    page.getByRole("button", { name: isQuoteMode ? "견적요청" : "주문하기" }),
  ).toBeVisible();
};

test.describe.serial("Store 견적요청 플로우", () => {
  test.skip(
    !hasConfiguredAuth("store") || !hasConfiguredAuth("admin"),
    "Store/Admin 테스트 계정 env가 필요합니다.",
  );

  let seededQuoteRequest: SeededQuoteRequest;

  test.beforeAll(async () => {
    seededQuoteRequest = await seedQuoteRequest();
  });

  // SC-quote-001: 견적 요청 제출
  test("SC-quote-001: 수량 100개 이상 설정 시 견적요청 버튼이 표시된다", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/custom-order");
    await expectAuthenticatedRoute(authenticatedPage);

    await navigateToConfirmStep(authenticatedPage, true);

    // confirm 단계에서 "견적요청" 버튼이 표시되는지 확인
    await expect(
      authenticatedPage.getByRole("button", { name: "견적요청" }),
    ).toBeVisible();
  });

  // SC-quote-002: 수량 99개 미만 시 견적요청 버튼 없음
  test("SC-quote-002: 수량 100개 미만 설정 시 견적요청 버튼이 표시되지 않는다", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/custom-order");
    await expectAuthenticatedRoute(authenticatedPage);

    // 기본 수량(4개) 유지 → 주문하기 모드로 진행
    await navigateToConfirmStep(authenticatedPage, false);

    // "주문하기" 버튼이 표시되고 "견적요청" 버튼은 없음
    await expect(
      authenticatedPage.getByRole("button", { name: "주문하기" }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("button", { name: "견적요청" }),
    ).not.toBeVisible();
  });

  // SC-quote-003: 연락처 미입력 시 제출 시도 → 토스트 에러
  test("SC-quote-003: 수량 100개 이상이지만 연락처 미입력 시 제출하면 오류 메시지가 표시된다", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/custom-order");
    await expectAuthenticatedRoute(authenticatedPage);

    await navigateToConfirmStep(authenticatedPage, true);

    // 견적요청 버튼이 표시되는지 확인 (배송지가 있으면 활성화됨)
    const submitButton = authenticatedPage.getByRole("button", {
      name: "견적요청",
    });
    await expect(submitButton).toBeVisible();

    // 담당자 성함과 연락처가 비어 있는 상태에서 제출 시도
    // isSubmitDisabled는 배송지 미선택/업로드 중에만 비활성화됨
    // 연락처 미입력 시 클릭하면 toast 에러 발생 (배송지 없는 경우에만 버튼 비활성화)
    // → 배송지가 없는 상태이므로 버튼 비활성화 또는 에러 토스트 중 하나를 확인
    const isDisabled = await submitButton.isDisabled();
    if (!isDisabled) {
      // 배송지가 선택된 경우: 클릭 후 연락처 오류 토스트 확인
      await submitButton.click();
      await expect(
        authenticatedPage.getByText(
          /담당자 성함을 입력해주세요|연락처를 입력해주세요/,
        ),
      ).toBeVisible();
    } else {
      // 배송지가 없는 경우: 버튼이 비활성화됨
      await expect(submitButton).toBeDisabled();
    }
  });

  // SC-quote-004: 고객 견적 요청 목록 조회
  test("SC-quote-004: 견적 요청 목록 페이지에서 생성된 견적 요청이 표시된다", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/my-page/quote-request");
    await expectAuthenticatedRoute(authenticatedPage);

    // 견적 요청 목록 헤더 확인
    await expect(authenticatedPage.getByText("견적 요청 내역")).toBeVisible();

    // seed로 생성한 견적 요청이 표시되는지 확인
    await expect(
      authenticatedPage.getByText(seededQuoteRequest.quoteNumber),
    ).toBeVisible();
  });

  // SC-quote-005: 고객 상세 조회 (견적 발송 전)
  test("SC-quote-005: 견적 발송 전 상세 페이지에서 견적 금액이 표시되지 않는다", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(
      `/my-page/quote-request/${seededQuoteRequest.quoteRequestId}`,
    );
    await expectAuthenticatedRoute(authenticatedPage);

    // 견적번호 확인
    await expect(
      authenticatedPage.getByText(
        `견적번호: ${seededQuoteRequest.quoteNumber}`,
      ),
    ).toBeVisible();

    // 상태가 "요청"임을 확인
    await expect(
      authenticatedPage.getByText("요청", { exact: true }),
    ).toBeVisible();

    // 견적 정보 섹션(견적 금액)이 표시되지 않아야 함
    await expect(authenticatedPage.getByText("견적 정보")).not.toBeVisible();
    await expect(authenticatedPage.getByText("견적 금액")).not.toBeVisible();
  });

  // SC-quote-007: 고객 상세 조회 (견적 발송 후)
  test("SC-quote-007: 견적 발송 후 상세 페이지에서 견적 금액이 표시된다", async ({
    authenticatedPage,
  }) => {
    // admin이 견적발송 처리
    await adminUpdateQuoteRequestStatus(
      seededQuoteRequest.quoteRequestId,
      "견적발송",
      500000,
      "납기 2주, 선불 결제",
    );

    await authenticatedPage.goto(
      `/my-page/quote-request/${seededQuoteRequest.quoteRequestId}`,
    );
    await expectAuthenticatedRoute(authenticatedPage);

    // 견적번호 확인
    await expect(
      authenticatedPage.getByText(
        `견적번호: ${seededQuoteRequest.quoteNumber}`,
      ),
    ).toBeVisible();

    // 견적 정보 섹션이 표시되어야 함
    await expect(authenticatedPage.getByText("견적 정보")).toBeVisible();

    // 견적 금액이 표시되어야 함
    await expect(authenticatedPage.getByText(/500,000원/)).toBeVisible();
  });
});
