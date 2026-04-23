import { describe, expect, it, vi } from "vitest";
import { installMockAiDesign } from "../../../../../../e2e/utils/mock-ai-design";

describe("installMockAiDesign", () => {
  it("design mock은 OpenAI endpoint만 라우팅한다", async () => {
    const route = vi.fn();
    const page = {
      route,
    } as unknown as Parameters<typeof installMockAiDesign>[0];

    await installMockAiDesign(page, {
      type: "text",
      aiMessage: "ok",
    });

    expect(route).toHaveBeenCalledTimes(1);
    expect(route).toHaveBeenCalledWith(
      "**/functions/v1/generate-open-api",
      expect.any(Function),
    );
  });
});
