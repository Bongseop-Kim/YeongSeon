import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const publicPages = [
  { path: "/", name: "홈" },
  { path: "/cart", name: "비회원 장바구니" },
] as const;

const scanPage = async (page: Page) => {
  await page.waitForLoadState("networkidle");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  return results.violations
    .filter((violation) => {
      return violation.impact === "serious" || violation.impact === "critical";
    })
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.target),
    }));
};

test.describe("Store 공개 화면 접근성", () => {
  for (const publicPage of publicPages) {
    test(`${publicPage.name} 화면에 serious 이상 axe 위반이 없다`, async ({
      page,
    }) => {
      await page.goto(publicPage.path);

      await expect(scanPage(page)).resolves.toEqual([]);
    });
  }
});
