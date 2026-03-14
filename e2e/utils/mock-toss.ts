import type { Page } from "@playwright/test";

export const installMockToss = async (page: Page, mode: "success" | "fail") => {
  await page.addInitScript((paymentMode) => {
    window.__E2E_MOCK_TOSS__ = {
      requestPayment: async ({ orderId, successUrl, failUrl }) => {
        const target =
          paymentMode === "success" ? new URL(successUrl) : new URL(failUrl);

        if (paymentMode === "success") {
          target.searchParams.set("paymentKey", "e2e-payment-key");
          target.searchParams.set("orderId", orderId);
          target.searchParams.set("amount", "5000");
        } else {
          target.searchParams.set("code", "MOCK_PAYMENT_FAILED");
          target.searchParams.set("message", "E2E payment failure");
        }

        window.location.assign(target.toString());
      },
    };
  }, mode);
};
