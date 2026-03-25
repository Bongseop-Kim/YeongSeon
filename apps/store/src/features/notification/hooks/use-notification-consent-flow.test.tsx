import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNotificationConsentFlow } from "@/features/notification/hooks/use-notification-consent-flow";

const { saveNotificationConsent } = vi.hoisted(() => ({
  saveNotificationConsent: vi.fn(),
}));

const refetchStatus = vi.fn();
const notificationStatus = {
  notificationConsent: false,
  phoneVerified: false,
};

vi.mock("@/features/notification/api/notification-api", () => ({
  saveNotificationConsent,
}));

vi.mock("@/features/notification/api/notification-status-query", () => ({
  useNotificationStatus: () => ({
    data: notificationStatus,
    refetch: refetchStatus,
  }),
}));

describe("useNotificationConsentFlow", () => {
  const onProceed = vi.fn();

  beforeEach(() => {
    onProceed.mockReset().mockResolvedValue(undefined);
    saveNotificationConsent.mockReset().mockResolvedValue(undefined);
    refetchStatus.mockReset().mockResolvedValue(undefined);
    notificationStatus.notificationConsent = false;
    notificationStatus.phoneVerified = false;
  });

  it("동의가 없을 때 initiateWithConsentCheck은 동의 모달을 표시한다", async () => {
    const { result } = renderHook(() => useNotificationConsentFlow(onProceed));

    await act(async () => {
      await result.current.initiateWithConsentCheck();
    });

    expect(result.current.consentFlow.showConsentModal).toBe(true);
    expect(onProceed).not.toHaveBeenCalled();
  });

  it("동의가 있을 때 initiateWithConsentCheck은 onProceed를 바로 호출한다", async () => {
    notificationStatus.notificationConsent = true;
    const { result } = renderHook(() => useNotificationConsentFlow(onProceed));

    await act(async () => {
      await result.current.initiateWithConsentCheck();
    });

    expect(result.current.consentFlow.showConsentModal).toBe(false);
    expect(onProceed).toHaveBeenCalled();
  });

  it("agreed=false이면 모달을 닫고 onProceed를 호출한다", async () => {
    const { result } = renderHook(() => useNotificationConsentFlow(onProceed));

    await act(async () => {
      await result.current.consentFlow.handleConsent(false);
    });

    expect(result.current.consentFlow.showConsentModal).toBe(false);
    expect(saveNotificationConsent).not.toHaveBeenCalled();
    expect(onProceed).toHaveBeenCalled();
  });

  it("agreed=true, phoneVerified=false이면 검증 모달을 표시한다", async () => {
    notificationStatus.phoneVerified = false;
    const { result } = renderHook(() => useNotificationConsentFlow(onProceed));

    await act(async () => {
      await result.current.consentFlow.handleConsent(true);
    });

    expect(result.current.consentFlow.showVerifyModal).toBe(true);
    expect(saveNotificationConsent).not.toHaveBeenCalled();
    expect(onProceed).not.toHaveBeenCalled();
  });

  it("agreed=true, phoneVerified=true이면 동의 저장 후 onProceed를 호출한다", async () => {
    notificationStatus.phoneVerified = true;
    const { result } = renderHook(() => useNotificationConsentFlow(onProceed));

    await act(async () => {
      await result.current.consentFlow.handleConsent(true);
    });

    expect(saveNotificationConsent).toHaveBeenCalledWith(true);
    expect(refetchStatus).toHaveBeenCalled();
    expect(onProceed).toHaveBeenCalled();
  });

  it("onVerified는 동의 저장, refetch, 모달 닫기, onProceed를 수행한다", async () => {
    const { result } = renderHook(() => useNotificationConsentFlow(onProceed));

    await act(async () => {
      await result.current.consentFlow.handleConsent(true);
    });

    await act(async () => {
      await result.current.consentFlow.onVerified();
    });

    expect(saveNotificationConsent).toHaveBeenCalledWith(true);
    expect(refetchStatus).toHaveBeenCalled();
    expect(result.current.consentFlow.showVerifyModal).toBe(false);
    expect(onProceed).toHaveBeenCalled();
  });

  it("dismissConsentModal은 모달을 닫고 onProceed를 호출한다", async () => {
    const { result } = renderHook(() => useNotificationConsentFlow(onProceed));

    await act(async () => {
      await result.current.initiateWithConsentCheck();
    });

    await act(async () => {
      result.current.consentFlow.dismissConsentModal();
    });

    expect(result.current.consentFlow.showConsentModal).toBe(false);
    expect(onProceed).toHaveBeenCalled();
  });

  it("closeVerifyModal은 모달을 닫고 onProceed를 호출한다", async () => {
    const { result } = renderHook(() => useNotificationConsentFlow(onProceed));

    await act(async () => {
      await result.current.consentFlow.handleConsent(true);
    });

    await act(async () => {
      await result.current.consentFlow.closeVerifyModal();
    });

    expect(result.current.consentFlow.showVerifyModal).toBe(false);
    expect(onProceed).toHaveBeenCalled();
  });
});
