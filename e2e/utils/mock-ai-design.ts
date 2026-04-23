import type { Page } from "@playwright/test";

type MockAiDesignMode =
  | {
      type: "text";
      aiMessage: string;
      remainingTokens?: number;
    }
  | {
      type: "image";
      aiMessage: string;
      imageUrl?: string;
      remainingTokens?: number;
    }
  | {
      type: "image-missing";
      aiMessage: string;
      remainingTokens?: number;
    };

const DEFAULT_IMAGE_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7x8AAAAASUVORK5CYII=";

export const installMockAiDesign = async (
  page: Page,
  mode: MockAiDesignMode,
) => {
  const routes = ["**/functions/v1/generate-open-api"];

  await Promise.all(
    routes.map((url) =>
      page.route(url, async (route) => {
        const baseBody = {
          aiMessage: mode.aiMessage,
          contextChips: [],
          remainingTokens: mode.remainingTokens,
        };

        if (mode.type === "text") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...baseBody,
              imageUrl: null,
            }),
          });
          return;
        }

        if (mode.type === "image") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...baseBody,
              imageUrl: mode.imageUrl ?? DEFAULT_IMAGE_DATA_URI,
            }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...baseBody,
            imageUrl: null,
          }),
        });
      }),
    ),
  );
};
