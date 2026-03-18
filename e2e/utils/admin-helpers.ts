import type { Page } from "@playwright/test";

export const statusRow = (page: Page, status: string) =>
  page
    .locator("tr")
    .filter({ hasText: "상태" })
    .filter({ hasText: status })
    .first();
