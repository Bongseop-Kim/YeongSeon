import { describe, expect, it, vi } from "vitest";

const json = vi.fn();

vi.mock("@yeongseon/supabase", () => ({
  FunctionsHttpError: class FunctionsHttpError extends Error {
    context = { json };
  },
}));

import { FunctionsHttpError } from "@yeongseon/supabase";
import { extractEdgeFunctionErrorMessage } from "@/entities/order";

describe("extractEdgeFunctionErrorMessage", () => {
  it("FunctionsHttpError가 아니면 null을 반환한다", async () => {
    await expect(extractEdgeFunctionErrorMessage(new Error("x"))).resolves.toBe(
      null,
    );
  });

  it("payload.error 문자열을 trim해서 반환한다", async () => {
    json.mockResolvedValueOnce({ error: "  실패 메시지  " });

    await expect(
      extractEdgeFunctionErrorMessage(new FunctionsHttpError("edge failed")),
    ).resolves.toBe("실패 메시지");
  });

  it("payload 형식이 잘못되면 null을 반환한다", async () => {
    json.mockResolvedValueOnce({ error: "" });

    await expect(
      extractEdgeFunctionErrorMessage(new FunctionsHttpError("edge failed")),
    ).resolves.toBe(null);
  });

  it("json 파싱이 실패하면 null을 반환한다", async () => {
    json.mockRejectedValueOnce(new Error("bad json"));

    await expect(
      extractEdgeFunctionErrorMessage(new FunctionsHttpError("edge failed")),
    ).resolves.toBe(null);
  });
});
