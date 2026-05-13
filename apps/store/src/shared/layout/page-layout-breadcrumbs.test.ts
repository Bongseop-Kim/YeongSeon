import { describe, expect, it } from "vitest";

const EXCLUDED_PATH_PARTS = [
  "/pages/design/",
  "/pages/shop/detail.tsx",
  "/features/shop/page.tsx",
];

const tsxSources = import.meta.glob<string>("../../**/*.tsx", {
  eager: true,
  import: "default",
  query: "?raw",
});

function isExcluded(filePath: string) {
  return EXCLUDED_PATH_PARTS.some((pathPart) => filePath.includes(pathPart));
}

describe("PageLayout breadcrumbs", () => {
  it("design과 shop/detail을 제외한 프로덕션 PageLayout 사용처는 breadcrumbs를 명시한다", () => {
    const missingBreadcrumbs = Object.entries(tsxSources)
      .filter(
        ([filePath]) =>
          !filePath.endsWith(".test.tsx") && !isExcluded(filePath),
      )
      .flatMap(([filePath, source]) => {
        const pageLayoutTags = source.match(/<PageLayout\b[\s\S]*?>/g) ?? [];

        return pageLayoutTags
          .filter((tag) => !tag.includes("breadcrumbs="))
          .map((tag) => {
            const line = source
              .slice(0, source.indexOf(tag))
              .split("\n").length;
            return `${filePath.replace("../../", "")}:${line}`;
          });
      });

    expect(missingBreadcrumbs).toEqual([]);
  });
});
