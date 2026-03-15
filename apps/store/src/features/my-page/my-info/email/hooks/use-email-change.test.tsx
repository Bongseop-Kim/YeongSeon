import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEmailChange } from "@/features/my-page/my-info/email/hooks/use-email-change";

const {
  success,
  error,
  requestMutateAsync,
  resendMutateAsync,
  verifyMutateAsync,
} = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  requestMutateAsync: vi.fn(),
  resendMutateAsync: vi.fn(),
  verifyMutateAsync: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success,
    error,
  },
}));

vi.mock("@/features/my-page/api/profile-query", () => ({
  useProfile: () => ({
    data: { email: "current@example.com" },
  }),
}));

vi.mock("@/features/my-page/api/email-query", () => ({
  useRequestEmailChangeCode: () => ({
    isPending: false,
    mutateAsync: requestMutateAsync,
  }),
  useResendEmailChangeCode: () => ({
    isPending: false,
    mutateAsync: resendMutateAsync,
  }),
  useVerifyEmailChangeCode: () => ({
    isPending: false,
    mutateAsync: verifyMutateAsync,
  }),
}));

describe("useEmailChange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T00:00:00Z"));
    success.mockReset();
    error.mockReset();
    requestMutateAsync.mockReset();
    resendMutateAsync.mockReset();
    verifyMutateAsync.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("인증번호 요청 성공 후 verify 단계로 이동한다", async () => {
    requestMutateAsync.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useEmailChange());

    act(() => {
      result.current.form.setValue("email", "next@example.com");
    });
    expect(result.current.canRequestCode).toBe(true);

    await act(async () => {
      await result.current.handleRequestCode();
    });

    expect(requestMutateAsync).toHaveBeenCalledWith("next@example.com");
    expect(result.current.step).toBe("verify");
    expect(result.current.requestedEmail).toBe("next@example.com");
    expect(result.current.canVerifyCode).toBe(false);
    expect(success).toHaveBeenCalledWith("인증번호를 전송했습니다.");
  });

  it("재전송 쿨다운과 인증 성공을 처리한다", async () => {
    requestMutateAsync.mockResolvedValueOnce(undefined);
    resendMutateAsync.mockResolvedValueOnce(undefined);
    verifyMutateAsync.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useEmailChange());

    act(() => {
      result.current.form.setValue("email", "next@example.com");
    });
    await act(async () => {
      await result.current.handleRequestCode();
    });

    expect(result.current.canResendCode).toBe(false);
    const nowSpy = vi.spyOn(Date, "now");
    const base = Date.now();
    nowSpy.mockImplementationOnce(() => base + 59_000);
    nowSpy.mockImplementationOnce(() => base + 61_000);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.canResendCode).toBe(true);

    await act(async () => {
      await result.current.handleResendCode();
    });
    expect(resendMutateAsync).toHaveBeenCalledWith("next@example.com");

    act(() => {
      result.current.form.setValue("emailCode", "123456");
    });
    expect(result.current.canVerifyCode).toBe(true);

    await act(async () => {
      await result.current.handleVerifyCode();
    });
    expect(verifyMutateAsync).toHaveBeenCalledWith({
      email: "next@example.com",
      code: "123456",
    });
    expect(result.current.step).toBe("complete");
    expect(success).toHaveBeenCalledWith("이메일이 변경되었습니다.");
  });

  it("실패 시 에러 메시지를 저장하고 뒤로가기를 처리한다", async () => {
    requestMutateAsync.mockRejectedValueOnce(new Error("요청 실패"));
    const { result } = renderHook(() => useEmailChange());

    act(() => {
      result.current.form.setValue("email", "next@example.com");
    });
    await act(async () => {
      await result.current.handleRequestCode();
    });
    expect(result.current.errorMessage).toBe("요청 실패");
    expect(error).toHaveBeenCalledWith("요청 실패");

    requestMutateAsync.mockResolvedValueOnce(undefined);
    resendMutateAsync.mockRejectedValueOnce(new Error("재전송 실패"));
    verifyMutateAsync.mockRejectedValueOnce(new Error("인증 실패"));

    await act(async () => {
      await result.current.handleRequestCode();
    });

    const nowSpy = vi.spyOn(Date, "now");
    const base = Date.now();
    nowSpy.mockImplementationOnce(() => base + 59_000);
    nowSpy.mockImplementationOnce(() => base + 61_000);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    await act(async () => {
      await result.current.handleResendCode();
    });
    expect(result.current.errorMessage).toBe("재전송 실패");

    act(() => {
      result.current.form.setValue("emailCode", "123456");
    });
    await act(async () => {
      await result.current.handleVerifyCode();
    });
    expect(result.current.errorMessage).toBe("인증 실패");

    act(() => {
      result.current.handleBackToRequest();
    });
    expect(result.current.step).toBe("request");
    expect(result.current.requestedEmail).toBe("");
    expect(result.current.form.getValues("emailCode")).toBe("");
  });
});
