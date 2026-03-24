import type { Page } from "@playwright/test";

type ClaimTypeLabel = "취소" | "반품" | "교환";

const claimTypeLabelToCode = (
  claimTypeLabel: ClaimTypeLabel,
): "cancel" | "return" | "exchange" => {
  switch (claimTypeLabel) {
    case "취소":
      return "cancel";
    case "반품":
      return "return";
    case "교환":
      return "exchange";
  }
};

export const claimCard = (
  page: Page,
  orderId: string,
  claimTypeLabel: ClaimTypeLabel,
) =>
  page.locator(
    `[data-testid^="claim-card-${orderId}-${claimTypeLabelToCode(claimTypeLabel)}-"]`,
  );
