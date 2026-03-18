import {
  expect,
  expectAuthenticatedRoute,
  hasConfiguredAuth,
  test,
} from "../fixtures/auth";
import {
  adminUpdateOrderStatus,
  seedCustomOrder,
  type SeededClaimOrder,
} from "../utils/store-data";

test.describe.serial("Store 주문 제작 플로우", () => {
  test.skip(
    !hasConfiguredAuth("store") || !hasConfiguredAuth("admin"),
    "Store/Admin 테스트 계정 env가 필요합니다.",
  );

  let customOrderForCancel: SeededClaimOrder;
  let customOrderForShipping: SeededClaimOrder;
  test.beforeAll(async () => {
    [customOrderForCancel, customOrderForShipping] = await Promise.all([
      // SC-custom-011용: 샘플봉제제작중 상태
      seedCustomOrder({ sample: true, sampleType: "sewing" }).then(
        async (o) => {
          await adminUpdateOrderStatus(o.orderId, "접수");
          await adminUpdateOrderStatus(o.orderId, "샘플봉제제작중");
          o.status = "샘플봉제제작중";
          return o;
        },
      ),
      // SC-custom-012용: 배송중 상태
      seedCustomOrder().then(async (o) => {
        await adminUpdateOrderStatus(o.orderId, "접수");
        await adminUpdateOrderStatus(o.orderId, "제작중");
        await adminUpdateOrderStatus(o.orderId, "제작완료");
        await adminUpdateOrderStatus(o.orderId, "배송중");
        o.status = "배송중";
        return o;
      }),
    ]);
  });

  // SC-custom-001: 마법사 전 단계 완료
  test("주문 제작 마법사 전 단계를 완료하면 확인 단계가 표시된다 (SC-custom-001)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/custom-order");
    await expectAuthenticatedRoute(authenticatedPage);

    // 수량 단계: 기본값 4, 그냥 다음 클릭
    await authenticatedPage.getByRole("button", { name: "다음" }).click();

    // 원단 단계: 기본값(POLY + PRINTING), 다음 클릭
    await authenticatedPage.getByRole("button", { name: "다음" }).click();

    // 봉제 단계: AUTO 타이 선택 후 다음 클릭
    await authenticatedPage.locator('label[for="tie-type-auto"]').click();
    await authenticatedPage.getByRole("button", { name: "다음" }).click();

    // 스펙/마무리/샘플 단계는 isSkippable=true 이므로 자동 스킵됨

    // 참고자료 단계: 다음 클릭
    await authenticatedPage.getByRole("button", { name: "다음" }).click();

    // 확인 단계: "주문하기" 버튼 표시 확인
    await expect(
      authenticatedPage.getByRole("button", { name: "주문하기" }),
    ).toBeVisible();
  });

  // SC-custom-002: 샘플 없이 주문 완료 (custom order는 결제 없이 직접 주문)
  test("주문 제작 주문하기 후 주문 목록 페이지로 이동한다 (SC-custom-002)", async ({
    authenticatedPage,
  }) => {
    let capturedOrderId: string | null = null;

    await authenticatedPage.route(
      "**/functions/v1/create-custom-order",
      async (route) => {
        const response = await route.fetch();
        const payload = (await response.json()) as {
          order_id: string;
          order_number: string;
        };
        capturedOrderId = payload.order_id;
        await route.fulfill({ response });
      },
    );

    await authenticatedPage.goto("/custom-order");
    await expectAuthenticatedRoute(authenticatedPage);

    // 수량 단계
    await authenticatedPage.getByRole("button", { name: "다음" }).click();

    // 원단 단계
    await authenticatedPage.getByRole("button", { name: "다음" }).click();

    // 봉제 단계: AUTO 선택
    await authenticatedPage.locator('label[for="tie-type-auto"]').click();
    await authenticatedPage.getByRole("button", { name: "다음" }).click();

    // 참고자료 단계
    await authenticatedPage.getByRole("button", { name: "다음" }).click();

    // 확인 단계: 주문하기 클릭
    await authenticatedPage.getByRole("button", { name: "주문하기" }).click();

    // 주문 목록 페이지로 이동 확인
    await expect(authenticatedPage).toHaveURL(/\/order\/order-list$/);

    // 주문 ID 캡처 완료 후 상세 페이지 이동 확인
    await expect.poll(() => capturedOrderId).not.toBeNull();
  });

  // SC-custom-003: 샘플 포함 주문 제작 (seeding 방식으로 상세 페이지 확인)
  test("샘플 포함 주문 제작 주문 상세 페이지가 표시된다 (SC-custom-003)", async ({
    authenticatedPage,
  }) => {
    const sampleOrder = await seedCustomOrder({
      sample: true,
      sampleType: "sewing",
    });

    await authenticatedPage.goto(`/order/${sampleOrder.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage);

    await expect(
      authenticatedPage.getByTestId("order-detail-root"),
    ).toBeVisible();
  });

  // SC-custom-011: 고객 샘플 단계 취소 요청
  test("샘플봉제제작중 상태 주문에서 취소 요청을 하면 취소 클레임이 접수된다 (SC-custom-011)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/order/${customOrderForCancel.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage);
    await expect(
      authenticatedPage.getByTestId("order-detail-root"),
    ).toBeVisible();

    await authenticatedPage.getByRole("button", { name: "취소 요청" }).click();

    await expect(authenticatedPage).toHaveURL(
      `/order/claim/cancel/${customOrderForCancel.orderId}/${customOrderForCancel.itemId}`,
    );

    await expect(
      authenticatedPage.getByText("취소 신청", { exact: true }),
    ).toBeVisible();
    await authenticatedPage.getByLabel("단순 변심").click();
    await authenticatedPage
      .getByPlaceholder(/사유를 자세히 입력해주세요\./)
      .fill("E2E custom order cancel claim");
    await authenticatedPage
      .getByRole("button", { name: "취소 신청하기" })
      .click();
    await expect(authenticatedPage).toHaveURL(/\/order\/claim-list$/);
  });

  // SC-custom-012: 고객 배송중 상태 취소 버튼 미노출
  test("배송중 상태 주문 제작 주문에서 취소 요청 버튼이 표시되지 않는다 (SC-custom-012)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/order/${customOrderForShipping.orderId}`);
    await expectAuthenticatedRoute(authenticatedPage);
    await expect(
      authenticatedPage.getByTestId("order-detail-root"),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("button", { name: "취소 요청" }),
    ).not.toBeVisible();
  });

  // SC-custom-013: dimple 옵션 (AUTO) 활성화
  test("봉제 단계에서 AUTO 타이 선택 시 dimple 옵션이 활성화된다 (SC-custom-013)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/custom-order");
    await expectAuthenticatedRoute(authenticatedPage);

    // 수량 단계 통과
    await authenticatedPage.getByRole("button", { name: "다음" }).click();

    // 원단 단계 통과
    await authenticatedPage.getByRole("button", { name: "다음" }).click();

    // 봉제 단계: AUTO 타이 선택
    await authenticatedPage.locator('label[for="tie-type-auto"]').click();

    // dimple 체크박스가 disabled 아님을 확인
    await expect(
      authenticatedPage.locator("#sewing-style-dimple"),
    ).not.toBeDisabled();
  });

  // SC-custom-014: dimple 옵션 (비AUTO) 비활성화
  test("봉제 단계에서 수동 타이 선택 시 dimple 옵션이 비활성화된다 (SC-custom-014)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/custom-order");
    await expectAuthenticatedRoute(authenticatedPage);

    // 수량 단계 통과
    await authenticatedPage.getByRole("button", { name: "다음" }).click();

    // 원단 단계 통과
    await authenticatedPage.getByRole("button", { name: "다음" }).click();

    // 봉제 단계: 수동 타이 선택 (기본값이 null/unset이므로 MANUAL 라디오 카드 클릭)
    await authenticatedPage.locator('label[for="tie-type-manual"]').click();

    // dimple 체크박스가 disabled 상태임을 확인
    await expect(
      authenticatedPage.locator("#sewing-style-dimple"),
    ).toBeDisabled();
  });
});
