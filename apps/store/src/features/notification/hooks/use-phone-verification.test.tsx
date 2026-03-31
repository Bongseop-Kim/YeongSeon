import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePhoneVerification } from "@/features/notification/hooks/use-phone-verification";

const { sendPhoneVerification, verifyPhone } = vi.hoisted(() => ({
  sendPhoneVerification: vi.fn(),
  verifyPhone: vi.fn(),
}));

vi.mock("@/entities/notification", () => ({
  sendPhoneVerification,
  verifyPhone,
}));

describe("usePhoneVerification", () => {
  const onVerified = vi.fn();

  beforeEach(() => {
    onVerified.mockReset();
    sendPhoneVerification.mockReset();
    verifyPhone.mockReset();
  });

  it("유효하지 않은 번호로 발송 시도 시 에러를 설정하고 발송하지 않는다", async () => {
    const { result } = renderHook(() => usePhoneVerification(onVerified));

    await act(async () => {
      result.current.setPhone("12345");
      await result.current.handleSend();
    });

    expect(result.current.error).toBe("유효한 휴대폰 번호를 입력해주세요.");
    expect(sendPhoneVerification).not.toHaveBeenCalled();
    expect(result.current.step).toBe("input");
  });

  it("유효한 번호로 발송 성공 시 verify 단계로 전이한다", async () => {
    sendPhoneVerification.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => usePhoneVerification(onVerified));

    act(() => {
      result.current.setPhone("01012345678");
    });
    await act(async () => {
      await result.current.handleSend();
    });

    expect(sendPhoneVerification).toHaveBeenCalledWith("01012345678");
    expect(result.current.step).toBe("verify");
    expect(result.current.error).toBeNull();
  });

  it("발송 실패 시 에러 메시지를 설정한다", async () => {
    sendPhoneVerification.mockRejectedValueOnce(new Error("서버 오류"));
    const { result } = renderHook(() => usePhoneVerification(onVerified));

    act(() => {
      result.current.setPhone("01012345678");
    });
    await act(async () => {
      await result.current.handleSend();
    });

    expect(result.current.error).toBe("서버 오류");
    expect(result.current.step).toBe("input");
    expect(result.current.isLoading).toBe(false);
  });

  it("6자리 미만 코드로 인증 시도 시 에러를 설정한다", async () => {
    sendPhoneVerification.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => usePhoneVerification(onVerified));

    act(() => {
      result.current.setPhone("01012345678");
    });
    await act(async () => {
      await result.current.handleSend();
    });

    act(() => {
      result.current.setCode("123");
    });
    await act(async () => {
      await result.current.handleVerify();
    });

    expect(result.current.error).toBe("6자리 인증번호를 입력해주세요.");
    expect(verifyPhone).not.toHaveBeenCalled();
  });

  it("인증 성공 시 done 단계로 전이하고 onVerified를 호출한다", async () => {
    sendPhoneVerification.mockResolvedValueOnce(undefined);
    verifyPhone.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => usePhoneVerification(onVerified));

    act(() => {
      result.current.setPhone("01012345678");
    });
    await act(async () => {
      await result.current.handleSend();
    });

    act(() => {
      result.current.setCode("123456");
    });
    await act(async () => {
      await result.current.handleVerify();
    });

    expect(verifyPhone).toHaveBeenCalledWith("01012345678", "123456");
    expect(onVerified).toHaveBeenCalled();
    expect(result.current.step).toBe("done");
  });

  it("인증 실패 시 에러 메시지를 설정하고 단계를 유지한다", async () => {
    sendPhoneVerification.mockResolvedValueOnce(undefined);
    verifyPhone.mockRejectedValueOnce(new Error("인증 실패"));

    const { result } = renderHook(() => usePhoneVerification(onVerified));

    act(() => {
      result.current.setPhone("01012345678");
    });
    await act(async () => {
      await result.current.handleSend();
    });

    act(() => {
      result.current.setCode("123456");
    });
    await act(async () => {
      await result.current.handleVerify();
    });

    expect(result.current.error).toBe("인증 실패");
    expect(result.current.step).toBe("verify");
    expect(result.current.isLoading).toBe(false);
  });

  it("재발송 시 코드를 초기화하고 다시 발송한다", async () => {
    sendPhoneVerification.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePhoneVerification(onVerified));

    act(() => {
      result.current.setPhone("01012345678");
    });
    await act(async () => {
      await result.current.handleSend();
    });

    act(() => {
      result.current.setCode("111111");
    });

    await act(async () => {
      await result.current.handleResend();
    });

    expect(result.current.code).toBe("");
    expect(sendPhoneVerification).toHaveBeenCalledTimes(2);
  });

  it("발송 성공 시 카운트다운이 300으로 시작된다", async () => {
    vi.useFakeTimers();
    sendPhoneVerification.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => usePhoneVerification(onVerified));

    act(() => {
      result.current.setPhone("01012345678");
    });
    await act(async () => {
      await result.current.handleSend();
    });

    expect(result.current.countdown).toBe(300);
    vi.useRealTimers();
  });

  it("1초가 지나면 카운트다운이 299로 줄어든다", async () => {
    vi.useFakeTimers();
    sendPhoneVerification.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => usePhoneVerification(onVerified));

    act(() => {
      result.current.setPhone("01012345678");
    });
    await act(async () => {
      await result.current.handleSend();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.countdown).toBe(299);
    vi.useRealTimers();
  });

  it("재발송 시 카운트다운을 300으로 초기화한다", async () => {
    vi.useFakeTimers();
    sendPhoneVerification.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePhoneVerification(onVerified));

    await act(async () => {
      result.current.setPhone("01012345678");
    });
    await act(async () => {
      await result.current.handleSend();
    });

    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });
    expect(result.current.countdown).toBe(295);

    await act(async () => {
      await result.current.handleResend();
    });

    expect(result.current.countdown).toBe(300);
    vi.useRealTimers();
  });

  it("카운트다운이 0이면 isCountdownExpired가 true다", async () => {
    vi.useFakeTimers();
    sendPhoneVerification.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => usePhoneVerification(onVerified));

    act(() => {
      result.current.setPhone("01012345678");
    });
    await act(async () => {
      await result.current.handleSend();
    });

    act(() => {
      vi.advanceTimersByTime(300_000);
    });

    expect(result.current.countdown).toBe(0);
    expect(result.current.isCountdownExpired).toBe(true);
    vi.useRealTimers();
  });
});
