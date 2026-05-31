import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCustomOrderSubmit } from "@/features/custom-order/hooks/useCustomOrderSubmit";

const { navigate, success, error, createQuoteRequestMutateAsync } = vi.hoisted(
  () => ({
    navigate: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    createQuoteRequestMutateAsync: vi.fn(),
  }),
);

const modalOpenModal = vi.hoisted(() => vi.fn());
const modalConfirm = vi.hoisted(() => vi.fn());

const authState = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@/shared/store/auth", () => ({
  useAuthStore: () => ({
    user: authState.user,
  }),
}));

vi.mock("@/shared/lib/toast", () => ({
  toast: {
    success,
    error,
  },
}));

vi.mock("@/shared/store/modal", () => ({
  useModalStore: (
    selector?: (state: {
      openModal: typeof modalOpenModal;
      confirm: typeof modalConfirm;
    }) => unknown,
  ) => {
    const state = { openModal: modalOpenModal, confirm: modalConfirm };
    return selector ? selector(state) : state;
  },
}));

vi.mock("@/entities/quote-request", () => ({
  useCreateQuoteRequest: () => ({
    isPending: false,
    mutateAsync: createQuoteRequestMutateAsync,
  }),
  toCreateQuoteRequestInput: vi.fn((value) => value),
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
  contactName: "홍길동",
  businessName: "영선산업",
  contactMethod: "email" as const,
  contactValue: "hello@example.com",
});

describe("useCustomOrderSubmit", () => {
  beforeEach(() => {
    authState.user = { id: "user-1" };
    modalOpenModal.mockReset();
    modalOpenModal.mockImplementation(
      ({ onConfirm }: { onConfirm?: () => void }) => onConfirm?.(),
    );
    modalConfirm.mockReset();
    navigate.mockReset();
    success.mockReset();
    error.mockReset();
    createQuoteRequestMutateAsync.mockReset();
  });

  it("견적 요청 전 확인창에서 취소하면 제출하지 않는다", async () => {
    modalOpenModal.mockImplementationOnce(
      ({ onCancel }: { onCancel?: () => void }) => onCancel?.(),
    );

    const { result } = renderHook(() =>
      useCustomOrderSubmit({
        selectedAddressId: "addr-1",
        selectedAddress: { id: "addr-1" } as never,
        imageUpload: {
          isUploading: false,
          getImageRefs: () => [],
        } as never,
        watchedValues: createValues(100),
        formReset: vi.fn(),
        totalCost: 0,
      }),
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(modalOpenModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "견적 요청",
        description: "입력한 사양과 연락처로 견적 요청을 접수할까요?",
      }),
    );
    expect(createQuoteRequestMutateAsync).not.toHaveBeenCalled();
  });

  it("즉시주문(수량 < 100) 시 결제 페이지로 navigate한다", async () => {
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
        formReset: vi.fn(),
        totalCost: 10000,
      }),
    );

    expect(result.current.isSubmitDisabled).toBe(false);

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(navigate).toHaveBeenCalledWith(
      "/order/custom-payment",
      expect.objectContaining({
        state: expect.objectContaining({
          orderType: "custom",
          totalCost: 10000,
          coreOptions: expect.any(Object),
          imageRefs: expect.any(Array),
          additionalNotes: "메모",
        }),
      }),
    );
  });

  it("즉시주문이라도 비로그인이면 로그인 확인창을 띄우고 결제 페이지로 이동하지 않는다", async () => {
    authState.user = null;

    const { result } = renderHook(() =>
      useCustomOrderSubmit({
        selectedAddressId: null,
        selectedAddress: null,
        imageUpload: {
          isUploading: false,
          getImageRefs: () => [],
        } as never,
        watchedValues: createValues(10),
        formReset: vi.fn(),
        totalCost: 10000,
      }),
    );

    expect(result.current.isSubmitDisabled).toBe(false);

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(modalConfirm).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
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
        formReset: vi.fn(),
        totalCost: 0,
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
        formReset,
        totalCost: 0,
      }),
    );

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(createQuoteRequestMutateAsync).toHaveBeenCalled();
    expect(formReset).toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith("견적요청이 완료되었습니다!");
    expect(navigate).toHaveBeenCalledWith("/my-page/quote-request");
  });

  it("견적 요청 실패를 처리한다", async () => {
    createQuoteRequestMutateAsync.mockRejectedValueOnce(new Error("견적 실패"));
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
        formReset,
        totalCost: 0,
      }),
    );

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(error).toHaveBeenCalledWith("견적 실패");
  });
});
