import type { Page } from "@playwright/test";

export const statusRow = (page: Page, status: string) =>
  page.locator("main").getByText(status, { exact: true }).first();

export const advanceStatus = async (
  page: Page,
  buttonName: string | RegExp,
  memo?: string,
) => {
  await page.getByRole("button", { name: buttonName }).click();
  const dialog = page.locator('[role="dialog"], [role="alertdialog"]').last();
  if (memo) {
    await dialog
      .getByRole("textbox", { name: /메모|사유/ })
      .fill(memo, { timeout: 1_000 })
      .catch(() => {
        /* Some status dialogs do not expose an optional memo field. */
      });
  }
  await dialog.getByRole("button", { name: "변경" }).click();
};

export const saveOutboundShipping = async (page: Page, trackingNo: string) => {
  await page
    .getByRole("combobox", { name: "택배사" })
    .last()
    .selectOption({ label: "롯데택배" });
  await page.getByRole("textbox", { name: "송장번호" }).last().fill(trackingNo);
  await page.getByRole("button", { name: "저장" }).last().click();
};
