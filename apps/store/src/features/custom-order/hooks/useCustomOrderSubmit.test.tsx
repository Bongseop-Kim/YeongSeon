import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCustomOrderSubmit } from "@/features/custom-order/hooks/useCustomOrderSubmit";

const {
  navigate,
  success,
  error,
  createCustomOrderMutateAsync,
  createQuoteRequestMutateAsync,
} = vi.hoisted(() => ({
  navigate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  createCustomOrderMutateAsync: vi.fn(),
  createQuoteRequestMutateAsync: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@/store/auth", () => ({
  useAuthStore: () => ({
    user: { id: "user-1" },
  }),
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success,
    error,
  },
}));

vi.mock("@/features/custom-order/api/custom-order-query", () => ({
  useCreateCustomOrder: () => ({
    isPending: false,
    mutateAsync: createCustomOrderMutateAsync,
  }),
}));

vi.mock("@/features/quote-request/api/quote-request-query", () => ({
  useCreateQuoteRequest: () => ({
    isPending: false,
    mutateAsync: createQuoteRequestMutateAsync,
  }),
}));

const createValues = (quantity: number) => ({
  fabricProvided: false,
  reorder: false,
  fabricType: "SILK" as const,
  designType: "PRINTING" as const,
  tieType: null,
  interlining: null,
  interliningThickness: null,
  sizeType: "ADULT" as const,
  tieWidth: 8,
  triangleStitch: false,
  sideStitch: false,
  barTack: false,
  fold7: false,
  dimple: false,
  spoderato: false,
  brandLabel: false,
  careLabel: false,
  quantity,
  referenceImages: null,
  additionalNotes: "메모",
  sample: false,
  sampleType: null,
  contactName: "홍길동",
  contactTitle: "팀장",
  contactMethod: "email" as const,
  contactValue: "hello@example.com",
});

describe("useCustomOrderSubmit", () => {
  beforeEach(() => {
    navigate.mockReset();
    success.mockReset();
    error.mockReset();
    createCustomOrderMutateAsync.mockReset();
    createQuoteRequestMutateAsync.mockReset();
  });

  it("일반 주문을 생성하고 완료 후 이동한다", async () => {
    const clearDraft = vi.fn();
    const formReset = vi.fn();
    createCustomOrderMutateAsync.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() =>
      useCustomOrderSubmit({
        selectedAddressId: "addr-1",
        selectedAddress: { id: "addr-1" } as never,
        imageUpload: {
          isUploading: false,
          getImageRefs: () => [
            { url: "https://example.com/1.jpg", fileId: "file-1" },
          ],
        } as never,
        watchedValues: createValues(10),
        clearDraft,
        formReset,
      }),
    );

    expect(result.current.isSubmitDisabled).toBe(false);

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(createCustomOrderMutateAsync).toHaveBeenCalled();
    expect(clearDraft).toHaveBeenCalled();
    expect(formReset).toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith("주문이 완료되었습니다!");
    expect(navigate).toHaveBeenCalledWith("/order/order-list");
  });

  it("견적 요청 모드에서 필수 연락처와 업로드 상태를 검증한다", async () => {
    const { result } = renderHook(() =>
      useCustomOrderSubmit({
        selectedAddressId: "addr-1",
        selectedAddress: { id: "addr-1" } as never,
        imageUpload: {
          isUploading: true,
          getImageRefs: () => [],
        } as never,
        watchedValues: {
          ...createValues(100),
          contactName: "",
          contactValue: "",
        },
        clearDraft: vi.fn(),
        formReset: vi.fn(),
      }),
    );

    expect(result.current.isSubmitDisabled).toBe(true);

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(error).toHaveBeenCalledWith("담당자 성함을 입력해주세요.");
  });

  it("견적 요청 성공과 실패를 처리한다", async () => {
    createQuoteRequestMutateAsync.mockResolvedValueOnce(undefined);
    const clearDraft = vi.fn();
    const formReset = vi.fn();

    const { result } = renderHook(() =>
      useCustomOrderSubmit({
        selectedAddressId: "addr-1",
        selectedAddress: { id: "addr-1" } as never,
        imageUpload: {
          isUploading: false,
          getImageRefs: () => [],
        } as never,
        watchedValues: createValues(100),
        clearDraft,
        formReset,
      }),
    );

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(createQuoteRequestMutateAsync).toHaveBeenCalled();
    expect(clearDraft).toHaveBeenCalled();
    expect(formReset).toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith("견적요청이 완료되었습니다!");
  });

  it("견적 요청 실패를 처리한다", async () => {
    createQuoteRequestMutateAsync.mockRejectedValueOnce(new Error("견적 실패"));
    const clearDraft = vi.fn();
    const formReset = vi.fn();

    const { result } = renderHook(() =>
      useCustomOrderSubmit({
        selectedAddressId: "addr-1",
        selectedAddress: { id: "addr-1" } as never,
        imageUpload: {
          isUploading: false,
          getImageRefs: () => [],
        } as never,
        watchedValues: createValues(100),
        clearDraft,
        formReset,
      }),
    );

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(error).toHaveBeenCalledWith("견적 실패");
  });
});
