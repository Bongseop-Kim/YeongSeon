import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useForm } from "react-hook-form";
import {
  useAutoSave,
  useRestoreDraft,
  useWizardDraft,
} from "@/features/custom-order/hooks/useWizardDraft";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";

const { info, dismiss } = vi.hoisted(() => ({
  info: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    info,
    dismiss,
  },
}));

const createFormValues = (): QuoteOrderOptions => ({
  fabricProvided: false,
  reorder: false,
  fabricType: "SILK",
  designType: "PRINTING",
  tieType: null,
  interlining: null,
  interliningThickness: null,
  sizeType: "ADULT",
  tieWidth: 8,
  triangleStitch: false,
  sideStitch: false,
  barTack: false,
  fold7: false,
  dimple: false,
  spoderato: false,
  brandLabel: false,
  careLabel: false,
  quantity: 10,
  referenceImages: null,
  additionalNotes: "",
  sample: false,
  sampleType: null,
  contactName: "홍길동",
  contactTitle: "담당자",
  contactMethod: "email",
  contactValue: "hello@example.com",
});

const createStorage = () => {
  let store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store = new Map<string, string>();
    }),
  };
};

const useAutoSaveHarness = () => {
  const form = useForm<QuoteOrderOptions>({
    defaultValues: createFormValues(),
  });

  useAutoSave(form, {
    currentStepIndex: 0,
    visitedSteps: new Set([0]),
  });

  return form;
};

describe("useWizardDraft", () => {
  beforeEach(() => {
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: createStorage(),
    });
    vi.useFakeTimers();
    info.mockReset();
    dismiss.mockReset();
  });

  it("초안 저장 시 민감 필드를 비운다", () => {
    const { result } = renderHook(() => useWizardDraft());

    act(() => {
      result.current.saveDraft({
        formValues: {
          ...createFormValues(),
          referenceImages: [new File(["a"], "a.jpg")],
        },
        currentStepIndex: 2,
        visitedSteps: [0, 2],
        savedAt: 1,
      });
    });

    expect(
      JSON.parse(window.sessionStorage.getItem("custom-order-draft") ?? ""),
    ).toEqual(
      expect.objectContaining({
        formValues: expect.objectContaining({
          referenceImages: null,
          contactName: "",
          contactValue: "",
        }),
      }),
    );
  });

  it("유효하지 않은 초안은 null을 반환하고 clearDraft로 삭제한다", () => {
    window.sessionStorage.setItem("custom-order-draft", '{"bad":true}');
    const { result } = renderHook(() => useWizardDraft());

    expect(result.current.loadDraft()).toBeNull();

    act(() => {
      result.current.clearDraft();
    });
    expect(window.sessionStorage.getItem("custom-order-draft")).toBeNull();
  });
});

describe("useRestoreDraft", () => {
  it("toast 액션 클릭 시 초안을 복원한다", () => {
    window.sessionStorage.setItem(
      "custom-order-draft",
      JSON.stringify({
        formValues: createFormValues(),
        currentStepIndex: 2,
        visitedSteps: [0, 2],
        savedAt: Date.now(),
      }),
    );

    const resetTo = vi.fn();
    const reset = vi.fn();
    const form = {
      reset,
    } as unknown as ReturnType<typeof useForm<QuoteOrderOptions>>;

    renderHook(() => useRestoreDraft(form, resetTo));

    const config = info.mock.calls[0][1];
    act(() => {
      config.action.onClick();
    });

    expect(reset).toHaveBeenCalled();
    expect(resetTo).toHaveBeenCalledWith(2, new Set([0, 2]));
  });

  it("dismiss/autoClose와 바깥 클릭 시 초안을 정리한다", () => {
    window.sessionStorage.setItem(
      "custom-order-draft",
      JSON.stringify({
        formValues: createFormValues(),
        currentStepIndex: 1,
        visitedSteps: [0, 1],
        savedAt: Date.now(),
      }),
    );

    const form = { reset: vi.fn() } as unknown as ReturnType<
      typeof useForm<QuoteOrderOptions>
    >;

    renderHook(() => useRestoreDraft(form, vi.fn()));
    const config = info.mock.calls[0][1];

    act(() => {
      config.onAutoClose();
    });
    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith(
      "custom-order-draft",
    );

    window.sessionStorage.setItem(
      "custom-order-draft",
      JSON.stringify({
        formValues: createFormValues(),
        currentStepIndex: 1,
        visitedSteps: [0, 1],
        savedAt: Date.now(),
      }),
    );

    renderHook(() => useRestoreDraft(form, vi.fn()));
    const secondConfig = info.mock.calls[1][1];
    act(() => {
      secondConfig.onDismiss();
    });
    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith(
      "custom-order-draft",
    );
  });
});

describe("useAutoSave", () => {
  it("watch 변경과 step 변경 시 초안을 저장한다", () => {
    const { result, rerender } = renderHook(() => useAutoSaveHarness());

    act(() => {
      result.current.setValue("quantity", 20);
      vi.advanceTimersByTime(1000);
    });

    expect(
      JSON.parse(window.sessionStorage.getItem("custom-order-draft") ?? ""),
    ).toEqual(
      expect.objectContaining({
        currentStepIndex: 0,
        visitedSteps: [0],
        formValues: expect.objectContaining({ quantity: 20 }),
      }),
    );

    rerender();
  });
});
