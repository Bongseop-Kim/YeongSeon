import type { Page } from "@playwright/test";

type MockAiDesignMode =
  | { type: "text" }
  | { type: "image"; imageUrl?: string }
  | { type: "image-missing" };

const DEFAULT_IMAGE_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7x8AAAAASUVORK5CYII=";

export const installMockAiDesign = async (
  page: Page,
  mode: MockAiDesignMode,
) => {
  await page.route("**/functions/v1/generate-tile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        repeatTileUrl:
          mode.type === "image"
            ? (mode.imageUrl ?? DEFAULT_IMAGE_DATA_URI)
            : DEFAULT_IMAGE_DATA_URI,
        repeatTileWorkId: "mock-repeat-work",
        accentTileUrl: null,
        accentTileWorkId: null,
        accentLayout: null,
        patternType: "all_over",
        fabricType: "printed",
      }),
    });
  });
};
