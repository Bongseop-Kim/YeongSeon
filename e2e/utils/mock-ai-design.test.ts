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
      expect(url).toBe("**/functions/v1/generate-tile");
      handler = nextHandler;
    }),
  } as unknown as Parameters<typeof installMockAiDesign>[0];

  await installMockAiDesign(page, mode);
  expect(handler).not.toBeNull();
  if (!handler) {
    throw new Error("mock AI design route handler was not installed");
  }

  await handler({
    fulfill: vi.fn(async (payload: FulfillPayload) => {
      fulfilled = payload;
    }),
  });

  expect(fulfilled?.status).toBe(200);
  expect(fulfilled?.contentType).toBe("application/json");
  expect(fulfilled?.body).toBeDefined();
  return JSON.parse(fulfilled?.body ?? "{}") as Record<string, unknown>;
}

describe("installMockAiDesign", () => {
  it("design mock은 generate-tile endpoint만 라우팅한다", async () => {
    const route = vi.fn();
    const page = {
      route,
    } as unknown as Parameters<typeof installMockAiDesign>[0];

    await installMockAiDesign(page, { type: "text" });

    expect(route).toHaveBeenCalledTimes(1);
    expect(route).toHaveBeenCalledWith(
      "**/functions/v1/generate-tile",
      expect.any(Function),
    );
  });

  it("tile 응답 body를 fulfill한다", async () => {
    await expect(fulfillBody({ type: "text" })).resolves.toMatchObject({
      repeatTileUrl: expect.stringMatching(/^data:image\/png/),
      repeatTileWorkId: "mock-repeat-work",
      accentTileUrl: null,
      accentTileWorkId: null,
      patternType: "all_over",
      fabricType: "printed",
    });
  });

  it("image 응답 body에 기본 repeatTileUrl을 포함한다", async () => {
    const body = await fulfillBody({ type: "image" });

    expect(body.repeatTileUrl).toEqual(
      expect.stringMatching(/^data:image\/png/),
    );
  });

  it("image-missing 응답 body도 유효한 tile 응답을 반환한다", async () => {
    await expect(fulfillBody({ type: "image-missing" })).resolves.toMatchObject(
      {
        repeatTileUrl: expect.stringMatching(/^data:image\/png/),
        repeatTileWorkId: "mock-repeat-work",
      },
    );
  });
});
