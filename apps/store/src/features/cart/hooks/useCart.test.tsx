import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useCart } from "@/features/cart/hooks/useCart";
import {
  createProduct,
  createCartItem,
  createReformCartItem,
  createAppliedCoupon,
  createProductOption,
} from "@/test/fixtures";

// ── hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockGetGuestItems,
  mockSetGuestItems,
  mockClearGuest,
  mockToastError,
  mockShowCartAddedToast,
  mockAnalyticsTrack,
  mockSetCartItemsMutateAsync,
  mockClearCartItemsMutateAsync,
  mockReformPricingData,
} = vi.hoisted(() => ({
  mockGetGuestItems: vi.fn(),
  mockSetGuestItems: vi.fn(),
  mockClearGuest: vi.fn(),
  mockToastError: vi.fn(),
  mockShowCartAddedToast: vi.fn(),
  mockAnalyticsTrack: vi.fn(),
  mockSetCartItemsMutateAsync: vi.fn(),
  mockClearCartItemsMutateAsync: vi.fn(),
  mockReformPricingData: { data: undefined as unknown },
}));

const authState = { user: null as { id: string } | null };

vi.mock("@/shared/store/auth", () => ({
  useAuthStore: () => authState,
}));

vi.mock("@/features/cart/utils/cart-local-storage", () => ({
  getGuestItems: mockGetGuestItems,
  setGuestItems: mockSetGuestItems,
  clearGuest: mockClearGuest,
}));

vi.mock("@/shared/lib/toast", () => ({
  toast: { error: mockToastError },
}));

vi.mock("@/shared/lib/cart-toast", () => ({
  showCartAddedToast: mockShowCartAddedToast,
}));

vi.mock("@/shared/lib/analytics", () => ({
  analytics: { track: mockAnalyticsTrack },
}));

vi.mock("@/shared/lib/utils", () => ({
  generateItemId: (productId: string | number, optionId = "base") =>
    `${String(productId)}-${optionId}`,
}));

vi.mock("@/entities/cart", () => ({
  cartKeys: {
    all: ["cart"],
    items: (userId?: string) => ["cart", "items", userId],
    guest: () => ["cart", "guest"],
  },
  useCartItems: () => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    isFetched: false,
    isError: false,
  }),
  useSetCartItems: () => ({ mutateAsync: mockSetCartItemsMutateAsync }),
  useClearCartItems: () => ({ mutateAsync: mockClearCartItemsMutateAsync }),
}));

vi.mock("@/entities/reform", () => ({
  useReformPricing: () => mockReformPricingData,
  toReformData: (
    tie: unknown,
    _pricing: unknown,
  ): { tie: unknown; cost: number } => ({ tie, cost: 10000 }),
}));

// ── helpers ──────────────────────────────────────────────────────────────────

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

// ── tests ────────────────────────────────────────────────────────────────────

describe("useCart", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    authState.user = null;
    mockReformPricingData.data = undefined;
    queryClient = makeQueryClient();
    mockGetGuestItems.mockResolvedValue([]);
    mockSetGuestItems.mockResolvedValue(undefined);
    mockClearGuest.mockResolvedValue(undefined);
    mockSetCartItemsMutateAsync.mockResolvedValue(undefined);
    mockClearCartItemsMutateAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 비로그인(guest) ─────────────────────────────────────────────────────────

  describe("비로그인(guest) 상태", () => {
    it("초기 items는 빈 배열이다", async () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.initialized).toBe(true));
      expect(result.current.items).toEqual([]);
    });

    it("localStorage에 저장된 아이템을 반환한다", async () => {
      const item = createCartItem();
      mockGetGuestItems.mockResolvedValue([item]);

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.items).toHaveLength(1));
      expect(result.current.items[0].id).toBe(item.id);
    });

    it("addToCart: 새 상품을 localStorage에 추가하고 analytics를 호출한다", async () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.initialized).toBe(true));

      const product = createProduct();
      await act(async () => {
        await result.current.addToCart(product);
      });

      expect(mockSetGuestItems).toHaveBeenCalled();
      expect(mockAnalyticsTrack).toHaveBeenCalledWith(
        "add_to_cart",
        expect.objectContaining({
          currency: "KRW",
          value: product.price,
        }),
      );
    });

    it("addToCart: 기존 아이템 수량 합산 시 '이미 장바구니에 있는 상품' 토스트 표시", async () => {
      const product = createProduct();
      const option = createProductOption({ id: "opt-1" });
      const existingItem = createCartItem({
        id: `${product.id}-opt-1`,
        quantity: 1,
        selectedOption: option,
      });
      mockGetGuestItems.mockResolvedValue([existingItem]);

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.items).toHaveLength(1));

      await act(async () => {
        await result.current.addToCart(product, { option });
      });

      expect(mockShowCartAddedToast).toHaveBeenCalledWith(
        "이미 장바구니에 있는 상품입니다. 수량을 추가했습니다.",
      );
    });

    it("addToCart: 새 상품은 '장바구니에 추가되었습니다' 토스트 표시", async () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.initialized).toBe(true));

      await act(async () => {
        await result.current.addToCart(createProduct());
      });

      expect(mockShowCartAddedToast).toHaveBeenCalledWith(
        "장바구니에 추가되었습니다.",
      );
    });

    it("addToCart: showModal=false이면 토스트를 표시하지 않는다", async () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.initialized).toBe(true));

      await act(async () => {
        await result.current.addToCart(createProduct(), { showModal: false });
      });

      expect(mockShowCartAddedToast).not.toHaveBeenCalled();
    });

    it("removeFromCart: 아이템을 제거하고 product 타입이면 analytics를 호출한다", async () => {
      const item = createCartItem({ id: "item-1" });
      mockGetGuestItems.mockResolvedValue([item]);

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.items).toHaveLength(1));

      await act(async () => {
        await result.current.removeFromCart("item-1");
      });

      expect(mockSetGuestItems).toHaveBeenCalled();
      expect(mockAnalyticsTrack).toHaveBeenCalledWith(
        "remove_from_cart",
        expect.objectContaining({ currency: "KRW" }),
      );
    });

    it("removeFromCart: reform 타입은 analytics를 호출하지 않는다", async () => {
      const item = createReformCartItem({ id: "reform-1" });
      mockGetGuestItems.mockResolvedValue([item]);

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.items).toHaveLength(1));

      await act(async () => {
        await result.current.removeFromCart("reform-1");
      });

      expect(mockAnalyticsTrack).not.toHaveBeenCalledWith(
        "remove_from_cart",
        expect.anything(),
      );
    });

    it("updateQuantity: 수량을 변경하면 setGuestItems를 호출한다", async () => {
      const item = createCartItem({ id: "item-1", quantity: 1 });
      mockGetGuestItems.mockResolvedValue([item]);

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.items).toHaveLength(1));

      await act(async () => {
        await result.current.updateQuantity("item-1", 3);
      });

      expect(mockSetGuestItems).toHaveBeenCalled();
    });

    it("updateQuantity: 수량이 0 이하이면 no-op (sync 생략)", async () => {
      const item = createCartItem({ id: "item-1", quantity: 1 });
      mockGetGuestItems.mockResolvedValue([item]);

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.items).toHaveLength(1));

      await act(async () => {
        await result.current.updateQuantity("item-1", 0);
      });

      expect(mockSetGuestItems).not.toHaveBeenCalled();
    });

    it("clearCart: localStorage를 비운다", async () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.initialized).toBe(true));

      await act(async () => {
        await result.current.clearCart();
      });

      expect(mockClearGuest).toHaveBeenCalled();
    });

    it("applyCoupon: 쿠폰을 적용하고 setGuestItems를 호출한다", async () => {
      const item = createCartItem({ id: "item-1" });
      mockGetGuestItems.mockResolvedValue([item]);

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.items).toHaveLength(1));

      const coupon = createAppliedCoupon();
      await act(async () => {
        await result.current.applyCoupon("item-1", coupon);
      });

      expect(mockSetGuestItems).toHaveBeenCalled();
    });

    it("updateProductOption: 옵션을 변경하고 setGuestItems를 호출한다", async () => {
      const option = createProductOption({ id: "opt-1" });
      const item = createCartItem({
        id: `1-opt-1`,
        selectedOption: option,
      });
      mockGetGuestItems.mockResolvedValue([item]);

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.items).toHaveLength(1));

      const newOption = createProductOption({ id: "opt-2", name: "새 옵션" });
      await act(async () => {
        await result.current.updateProductOption(`1-opt-1`, newOption, 2);
      });

      expect(mockSetGuestItems).toHaveBeenCalled();
    });

    it("addReformToCart: 수선 아이템을 추가하고 토스트를 표시한다", async () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.initialized).toBe(true));

      const reformData = {
        tie: {
          id: "tie-1",
          measurementType: "length" as const,
          tieLength: 145,
        },
        cost: 15000,
      };

      await act(async () => {
        await result.current.addReformToCart(reformData);
      });

      expect(mockSetGuestItems).toHaveBeenCalled();
      expect(mockShowCartAddedToast).toHaveBeenCalledWith(
        "수선 요청이 장바구니에 추가되었습니다.",
      );
    });

    it("addMultipleReformToCart: 여러 수선 아이템을 한 번에 추가하고 토스트를 한 번만 표시한다", async () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.initialized).toBe(true));

      const reforms = [
        {
          tie: {
            id: "tie-1",
            measurementType: "length" as const,
            tieLength: 145,
          },
          cost: 15000,
        },
        {
          tie: {
            id: "tie-2",
            measurementType: "length" as const,
            tieLength: 150,
          },
          cost: 20000,
        },
      ];

      await act(async () => {
        await result.current.addMultipleReformToCart(reforms);
      });

      expect(mockSetGuestItems).toHaveBeenCalledTimes(1);
      expect(mockShowCartAddedToast).toHaveBeenCalledTimes(1);
    });

    it("updateReformOption: reformPricing 없으면 에러를 throw한다", async () => {
      mockReformPricingData.data = undefined;
      const item = createReformCartItem({ id: "reform-1" });
      mockGetGuestItems.mockResolvedValue([item]);

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.items).toHaveLength(1));

      await expect(
        act(async () => {
          await result.current.updateReformOption("reform-1", {
            id: "tie-1",
            measurementType: "length",
            tieLength: 145,
          });
        }),
      ).rejects.toThrow("수선 비용 정보를 불러오지 못했어요.");
    });

    it("updateReformOption: reformPricing이 있으면 옵션을 갱신한다", async () => {
      mockReformPricingData.data = { lengthCost: 5000, widthCost: 7000 };
      const item = createReformCartItem({ id: "reform-1" });
      mockGetGuestItems.mockResolvedValue([item]);

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.items).toHaveLength(1));

      await act(async () => {
        await result.current.updateReformOption("reform-1", {
          id: "tie-1",
          measurementType: "length",
          tieLength: 150,
        });
      });

      expect(mockSetGuestItems).toHaveBeenCalled();
    });
  });

  // ── totalItems / totalPrice ─────────────────────────────────────────────────

  describe("summary 계산", () => {
    it("totalItems는 장바구니 수량 합계를 반환한다", async () => {
      const item1 = createCartItem({ id: "item-1", quantity: 2 });
      const item2 = createCartItem({ id: "item-2", quantity: 3 });
      mockGetGuestItems.mockResolvedValue([item1, item2]);

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.totalItems).toBe(5));
    });

    it("totalPrice는 상품 금액 합계를 반환한다", async () => {
      const product = createProduct({ price: 10000 });
      const item = createCartItem({
        id: "item-1",
        product,
        quantity: 2,
        selectedOption: undefined,
      });
      mockGetGuestItems.mockResolvedValue([item]);

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.totalPrice).toBeGreaterThan(0));
    });

    it("빈 장바구니에서 totalItems=0, totalPrice=0", async () => {
      mockGetGuestItems.mockResolvedValue([]);

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.initialized).toBe(true));
      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalPrice).toBe(0);
    });
  });

  // ── initialized / isLoading 분기 ────────────────────────────────────────────

  describe("initialized / isLoading", () => {
    it("비로그인: guest 쿼리가 fetch 완료되면 initialized=true", async () => {
      mockGetGuestItems.mockResolvedValue([]);

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.initialized).toBe(true));
    });

    it("비로그인: 초기 로딩 중 isLoading=true가 될 수 있다", () => {
      let resolveItems: (v: unknown[]) => void;
      mockGetGuestItems.mockReturnValue(
        new Promise((res) => {
          resolveItems = res;
        }),
      );

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      // 쿼리가 pending인 동안 isLoading true
      expect(result.current.isLoading).toBe(true);

      // cleanup
      act(() => {
        resolveItems([]);
      });
    });
  });

  // ── 로그인 상태 (서버 장바구니) ────────────────────────────────────────────

  describe("로그인 상태", () => {
    it("로그인 시 setCartItems mutation을 사용해 장바구니를 동기화한다", async () => {
      authState.user = { id: "user-1" };

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      // 로그인 상태에서 addToCart는 setCartItemsMutateAsync를 호출한다
      await act(async () => {
        await result.current.addToCart(createProduct());
      });

      expect(mockSetCartItemsMutateAsync).toHaveBeenCalled();
    });

    it("로그인 시 clearCart는 서버 mutation을 호출한다", async () => {
      authState.user = { id: "user-1" };
      queryClient.setQueryData(["cart", "items", "user-1"], []);

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await act(async () => {
        await result.current.clearCart();
      });

      expect(mockClearCartItemsMutateAsync).toHaveBeenCalled();
    });

    it("로그인 시 guest localStorage는 사용하지 않는다", async () => {
      authState.user = { id: "user-1" };
      queryClient.setQueryData(["cart", "items", "user-1"], []);

      const { result } = renderHook(() => useCart(), {
        wrapper: makeWrapper(queryClient),
      });

      await act(async () => {
        await result.current.addToCart(createProduct());
      });

      expect(mockSetGuestItems).not.toHaveBeenCalled();
    });
  });
});
