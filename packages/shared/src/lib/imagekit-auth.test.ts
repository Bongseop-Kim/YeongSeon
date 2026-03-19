import { describe, it, expect, vi } from "vitest";
import { getImageKitAuth } from "./imagekit-auth";

describe("getImageKitAuth", () => {
  it("유효한 응답을 반환한다", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { signature: "sig123", token: "tok456", expire: 1234567890 },
      error: null,
    });
    const result = await getImageKitAuth(invoke);
    expect(result).toEqual({
      signature: "sig123",
      token: "tok456",
      expire: 1234567890,
    });
    expect(invoke).toHaveBeenCalledWith("imagekit-auth");
  });

  it("invoke가 에러를 반환하면 에러를 던진다", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: new Error("edge function error"),
    });
    await expect(getImageKitAuth(invoke)).rejects.toThrow(
      "ImageKit 인증에 실패했습니다.",
    );
  });

  it("data가 null이면 에러를 던진다", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: null });
    await expect(getImageKitAuth(invoke)).rejects.toThrow(
      "ImageKit 인증에 실패했습니다.",
    );
  });

  it("응답에서 expire 필드가 누락되면 에러를 던진다", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { signature: "sig", token: "tok" },
      error: null,
    });
    await expect(getImageKitAuth(invoke)).rejects.toThrow(
      "ImageKit 인증 응답 형식이 올바르지 않습니다.",
    );
  });

  it("expire가 숫자가 아니면 에러를 던진다", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { signature: "sig", token: "tok", expire: "1234567890" },
      error: null,
    });
    await expect(getImageKitAuth(invoke)).rejects.toThrow(
      "ImageKit 인증 응답 형식이 올바르지 않습니다.",
    );
  });

  it("응답이 객체가 아니면 에러를 던진다", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: "invalid", error: null });
    await expect(getImageKitAuth(invoke)).rejects.toThrow(
      "ImageKit 인증 응답 형식이 올바르지 않습니다.",
    );
  });
});
