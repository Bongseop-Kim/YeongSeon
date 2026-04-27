import { describe, expect, it, vi } from "vitest";
import { installMockAiDesign } from "./mock-ai-design";

type FulfillPayload = {
  status: number;
  contentType: string;
  body: string;
};

async function fulfillBody(
  mode: Parameters<typeof installMockAiDesign>[1],
): Promise<Record<string, unknown>> {
  let handler:
    | ((route: {
        fulfill: (payload: FulfillPayload) => Promise<void>;
      }) => Promise<void>)
    | null = null;
  let fulfilled: FulfillPayload | null = null;
  const page = {
    route: vi.fn((url, nextHandler) => {
      expect(url).toBe("**/functions/v1/generate-open-api");
      handler = nextHandler;
    }),
  } as unknown as Parameters<typeof installMockAiDesign>[0];

  await installMockAiDesign(page, mode);
  expect(handler).not.toBeNull();

  await handler?.({
    fulfill: vi.fn(async (payload: FulfillPayload) => {
      fulfilled = payload;
    }),
  });

  expect(fulfilled?.status).toBe(200);
  expect(fulfilled?.contentType).toBe("application/json");
  return JSON.parse(fulfilled?.body ?? "{}") as Record<string, unknown>;
}

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

  it("text 응답 body를 fulfill한다", async () => {
    await expect(
      fulfillBody({ type: "text", aiMessage: "ok", remainingTokens: 7 }),
    ).resolves.toMatchObject({
      aiMessage: "ok",
      imageUrl: null,
      remainingTokens: 7,
    });
  });

  it("image 응답 body에 기본 imageUrl을 포함한다", async () => {
    const body = await fulfillBody({ type: "image", aiMessage: "ok" });

    expect(body.imageUrl).toEqual(expect.stringMatching(/^data:image\/png/));
  });

  it("image-missing 응답 body는 imageUrl을 null로 둔다", async () => {
    await expect(
      fulfillBody({ type: "image-missing", aiMessage: "missing" }),
    ).resolves.toMatchObject({
      aiMessage: "missing",
      imageUrl: null,
    });
  });
});
