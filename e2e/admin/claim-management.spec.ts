import {
  expect,
  expectAuthenticatedRoute,
  hasConfiguredAuth,
  test,
} from "../fixtures/auth";
import {
  adminUpdateClaimStatus,
  seedClaimForAdminFlow,
  type ClaimAdminSeed,
} from "../utils/store-data";

test.describe.serial("Admin 클레임 관리", () => {
  test.skip(
    !hasConfiguredAuth("store") || !hasConfiguredAuth("admin"),
    "Store/Admin 테스트 계정 env가 필요합니다.",
  );

  let cancelClaim: ClaimAdminSeed;
  let returnClaim: ClaimAdminSeed;
  let exchangeClaim: ClaimAdminSeed;
  let rejectClaim: ClaimAdminSeed;
  let rollbackClaim: ClaimAdminSeed;

  test.beforeAll(async () => {
    [cancelClaim, returnClaim, exchangeClaim, rejectClaim, rollbackClaim] =
      await Promise.all([
        seedClaimForAdminFlow("cancel"),
        seedClaimForAdminFlow("return"),
        seedClaimForAdminFlow("exchange"),
        seedClaimForAdminFlow("cancel"),
        seedClaimForAdminFlow("cancel"),
      ]);
  });

  // SC-claim-005: admin 취소 처리중으로 변경
  test("취소 클레임을 접수에서 처리중으로 변경한다 (SC-claim-005)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/claims/show/${cancelClaim.claimId}`);
    await expectAuthenticatedRoute(authenticatedPage, "/login");

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E cancel processing");
    await authenticatedPage
      .getByRole("button", { name: "처리중 으로 변경" })
      .click();
    await expect(
      authenticatedPage
        .locator(".ant-tag")
        .filter({ hasText: /^처리중$/ })
        .first(),
    ).toBeVisible();
  });

  // SC-claim-006: admin 취소 완료 처리
  test("처리중 취소 클레임을 완료로 변경한다 (SC-claim-006)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/claims/show/${cancelClaim.claimId}`);

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E cancel complete");
    await authenticatedPage
      .getByRole("button", { name: "완료 으로 변경" })
      .click();
    await expect(
      authenticatedPage.getByText("완료", { exact: true }).first(),
    ).toBeVisible();
  });

  // SC-claim-007: admin 취소 처리중 → 접수 롤백 (API로 처리 후 UI 검증)
  test("처리중 취소 클레임을 memo와 함께 접수로 롤백한다 (SC-claim-007)", async ({
    authenticatedPage,
  }) => {
    await adminUpdateClaimStatus(rollbackClaim.claimId, "처리중", "setup");

    // memo 없이 롤백 시 에러 발생 검증
    await expect(
      adminUpdateClaimStatus(rollbackClaim.claimId, "접수", null, true),
    ).rejects.toThrow();

    // memo와 함께 롤백
    await adminUpdateClaimStatus(
      rollbackClaim.claimId,
      "접수",
      "E2E rollback memo",
      true,
    );

    await authenticatedPage.goto(`/claims/show/${rollbackClaim.claimId}`);
    await expectAuthenticatedRoute(authenticatedPage, "/login");
    await expect(
      authenticatedPage
        .locator(".ant-tag")
        .filter({ hasText: /^접수$/ })
        .first(),
    ).toBeVisible();
  });

  // SC-claim-008~010: 반품 수거요청 → 수거완료 → 완료
  test("반품 클레임을 수거요청→수거완료→완료 순으로 처리한다 (SC-claim-008~010)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/claims/show/${returnClaim.claimId}`);
    await expectAuthenticatedRoute(authenticatedPage, "/login");

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E return pickup");
    await authenticatedPage
      .getByRole("button", { name: "수거요청 으로 변경" })
      .click();
    await expect(
      authenticatedPage
        .locator(".ant-tag")
        .filter({ hasText: /^수거요청$/ })
        .first(),
    ).toBeVisible();

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E return picked up");
    await authenticatedPage
      .getByRole("button", { name: "수거완료 으로 변경" })
      .click();
    await expect(
      authenticatedPage
        .locator(".ant-tag")
        .filter({ hasText: /^수거완료$/ })
        .first(),
    ).toBeVisible();

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E return done");
    await authenticatedPage
      .getByRole("button", { name: "완료 으로 변경" })
      .click();
    await expect(
      authenticatedPage.getByText("완료", { exact: true }).first(),
    ).toBeVisible();
  });

  // SC-claim-013: 수거완료 상태에서 롤백 버튼 미노출
  test("수거완료 상태에서 롤백 버튼이 표시되지 않는다 (SC-claim-013)", async ({
    authenticatedPage,
  }) => {
    const noRollbackClaim = await seedClaimForAdminFlow("return");
    await adminUpdateClaimStatus(noRollbackClaim.claimId, "수거요청");
    await adminUpdateClaimStatus(noRollbackClaim.claimId, "수거완료");

    await authenticatedPage.goto(`/claims/show/${noRollbackClaim.claimId}`);
    await expectAuthenticatedRoute(authenticatedPage, "/login");
    await expect(
      authenticatedPage.getByRole("button", { name: /으로 롤백/ }),
    ).not.toBeVisible();
  });

  // SC-claim-011~012: 교환 재발송 → 완료
  test("교환 클레임을 수거완료에서 재발송→완료로 처리한다 (SC-claim-011~012)", async ({
    authenticatedPage,
  }) => {
    await adminUpdateClaimStatus(exchangeClaim.claimId, "수거요청");
    await adminUpdateClaimStatus(exchangeClaim.claimId, "수거완료");

    await authenticatedPage.goto(`/claims/show/${exchangeClaim.claimId}`);
    await expectAuthenticatedRoute(authenticatedPage, "/login");

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E exchange resend");
    await authenticatedPage
      .getByRole("button", { name: "재발송 으로 변경" })
      .click();
    await expect(
      authenticatedPage
        .locator(".ant-tag")
        .filter({ hasText: /^재발송$/ })
        .first(),
    ).toBeVisible();

    await authenticatedPage
      .getByPlaceholder("상태 변경 사유 (이력에 기록됨)")
      .fill("E2E exchange done");
    await authenticatedPage
      .getByRole("button", { name: "완료 으로 변경" })
      .click();
    await expect(
      authenticatedPage.getByText("완료", { exact: true }).first(),
    ).toBeVisible();
  });

  // SC-claim-014~015: 거부 및 접수 복원 (API로 처리 후 UI 검증)
  test("클레임을 거부 처리하고 다시 접수로 복원한다 (SC-claim-014~015)", async ({
    authenticatedPage,
  }) => {
    // 거부 처리 (API)
    await adminUpdateClaimStatus(rejectClaim.claimId, "거부", "E2E reject");

    await authenticatedPage.goto(`/claims/show/${rejectClaim.claimId}`);
    await expectAuthenticatedRoute(authenticatedPage, "/login");
    await expect(
      authenticatedPage
        .locator(".ant-tag")
        .filter({ hasText: /^거부$/ })
        .first(),
    ).toBeVisible();

    // 거부 상태에서 "접수로 복원" 버튼이 표시되는지 확인
    await expect(
      authenticatedPage.getByRole("button", { name: "접수로 복원" }),
    ).toBeVisible();

    // 접수 복원 (API)
    await adminUpdateClaimStatus(
      rejectClaim.claimId,
      "접수",
      "E2E restore",
      true,
    );

    await authenticatedPage.reload();
    await expect(
      authenticatedPage
        .locator(".ant-tag")
        .filter({ hasText: /^접수$/ })
        .first(),
    ).toBeVisible();
  });
});
