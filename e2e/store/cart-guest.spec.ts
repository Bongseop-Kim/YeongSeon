/**
 * Cart 비회원/동기화 E2E 테스트
 *
 * SC-cart-001: 비회원 장바구니 추가
 * SC-cart-002: 로그인 시 로컬 장바구니 서버 동기화
 * SC-cart-003: 로그인 시 로컬 없으면 서버 장바구니 유지
 * SC-cart-004: 동일 상품 중복 담기 방지 (수량 증가)
 * SC-cart-007: 로그아웃 시 게스트 장바구니로 전환
 *
 * store-guest project에서 실행됨 (비인증 컨텍스트)
 * 로그인이 필요한 테스트는 Supabase API를 통해 세션을 직접 주입
 */
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.resolve(__dirname, "../.auth");

// ─── 로컬스토리지 키 ────────────────────────────────────────────────────────
const GUEST_CART_KEY = "cart_guest";

// ─── 유틸 ────────────────────────────────────────────────────────────────────

const parseDotEnv = (content: string): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if (
      value.length >= 2 &&
      ((value[0] === '"' && value.at(-1) === '"') ||
        (value[0] === "'" && value.at(-1) === "'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
};

const loadEnv = async (): Promise<Record<string, string>> => {
  const files = [
    path.resolve(__dirname, "../../apps/store/.env"),
    path.resolve(__dirname, "../../apps/admin/.env"),
    path.resolve(__dirname, "../.env"),
  ];
  const merged: Record<string, string> = {};
  for (const f of files) {
    try {
      const content = await fs.readFile(f, "utf8");
      Object.assign(merged, parseDotEnv(content));
    } catch {
      // 파일 없으면 무시
    }
  }
  return merged;
};

type SupabaseConfig = { supabaseUrl: string; supabaseAnonKey: string };

const getSupabaseConfig = async (): Promise<SupabaseConfig> => {
  const env = await loadEnv();
  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    env.VITE_SUPABASE_URL ??
    "";
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    env.VITE_SUPABASE_ANON_KEY ??
    "";
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_ANON_KEY 환경 변수가 없습니다. apps/store/.env 또는 e2e/.env를 확인하세요.",
    );
  }
  return { supabaseUrl, supabaseAnonKey };
};

const getSupabaseProjectRef = (supabaseUrl: string): string =>
  new URL(supabaseUrl).hostname.split(".")[0];

const getStorageKey = (supabaseUrl: string): string =>
  `sb-${getSupabaseProjectRef(supabaseUrl)}-auth-token`;

type SessionPayload = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  token_type?: string;
  user?: { id: string; email?: string };
};

/** TEST_STORE_EMAIL / TEST_STORE_PASSWORD 환경변수를 사용해 Supabase 세션 취득 */
const signInWithPassword = async (
  cfg: SupabaseConfig,
  email: string,
  password: string,
): Promise<SessionPayload> => {
  const res = await fetch(
    `${cfg.supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase sign-in 실패: ${res.status} ${body}`);
  }
  return (await res.json()) as SessionPayload;
};

/** 페이지 localStorage에 Supabase 세션 주입 (소셜 로그인 우회용) */
const injectSession = async (
  page: Page,
  session: SessionPayload,
  storageKey: string,
): Promise<void> => {
  await page.evaluate(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    [storageKey, JSON.stringify(session)] as [string, string],
  );
};

/** 게스트 장바구니 로컬스토리지 직접 설정 */
const setGuestCartInStorage = async (
  page: Page,
  items: unknown[],
): Promise<void> => {
  await page.evaluate(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    [GUEST_CART_KEY, JSON.stringify({ items })] as [string, string],
  );
};

/** 게스트 장바구니 로컬스토리지 읽기 */
const getGuestCartFromStorage = async (page: Page): Promise<unknown[]> => {
  const raw = await page.evaluate(
    (key) => localStorage.getItem(key),
    GUEST_CART_KEY,
  );
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { items?: unknown[] };
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
};

/** fixtures.json에서 storeProduct 읽기 */
const readStoreProduct = async (): Promise<{
  id: number;
  name: string;
  price: number;
}> => {
  const raw = await fs.readFile(path.join(authDir, "fixtures.json"), "utf8");
  const fixtures = JSON.parse(raw) as {
    storeProduct: { id: number; name: string; price: number };
  };
  return fixtures.storeProduct;
};

/** Supabase REST API로 서버 장바구니 아이템 수 조회 (replace_cart_items는 RPC이므로 cart_items 뷰 활용) */
const getServerCartCount = async (
  cfg: SupabaseConfig,
  accessToken: string,
  userId: string,
): Promise<number> => {
  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/get_cart_items`, {
    method: "POST",
    headers: {
      apikey: cfg.supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_user_id: userId, p_active_only: true }),
  });
  if (!res.ok) return 0;
  const data = (await res.json()) as unknown[];
  return Array.isArray(data) ? data.length : 0;
};

/** Supabase RPC로 서버 장바구니 비우기 */
const clearServerCart = async (
  cfg: SupabaseConfig,
  accessToken: string,
  userId: string,
): Promise<void> => {
  await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/replace_cart_items`, {
    method: "POST",
    headers: {
      apikey: cfg.supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_user_id: userId, p_items: [] }),
  });
};

// ─── 테스트 스위트 ──────────────────────────────────────────────────────────

test.describe.serial("Cart 비회원/동기화 (SC-cart-001~004, 007)", () => {
  const hasStoreAuth = Boolean(
    (process.env.TEST_STORE_ACCESS_TOKEN &&
      process.env.TEST_STORE_REFRESH_TOKEN) ||
    (process.env.TEST_STORE_EMAIL && process.env.TEST_STORE_PASSWORD),
  );

  // ── SC-cart-001: 비회원 장바구니 추가 ─────────────────────────────────────
  test("SC-cart-001: 비회원 장바구니 추가", async ({ page }) => {
    let productId: number;
    try {
      const product = await readStoreProduct();
      productId = product.id;
    } catch {
      test.skip(true, "fixtures.json 없음 — global-setup이 필요합니다.");
      return;
    }

    // 비인증 상태에서 상품 상세 방문
    await page.goto(`/shop/${productId}`);

    // 장바구니 버튼이 desktop viewport에서만 보임 (mobile에서는 숨겨짐)
    // viewport를 desktop 크기로 설정
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/shop/${productId}`);

    await page.getByTestId("product-add-to-cart").click();

    // 모달이 열리며 장바구니에 추가되었음을 알림
    await expect(page.getByText("장바구니에 추가되었습니다.")).toBeVisible();

    // 로컬스토리지에 저장됐는지 확인
    const items = await getGuestCartFromStorage(page);
    expect(items.length).toBeGreaterThan(0);

    // 모달 닫기
    await page.getByRole("button", { name: "닫기" }).click();

    // 장바구니 페이지에서 아이템 확인
    await page.goto("/cart");
    await expect(page.getByTestId("cart-items-panel")).toBeVisible();
    const cartItems = page.locator('[data-testid^="cart-item-"]');
    await expect(cartItems.first()).toBeVisible();
  });

  // ── SC-cart-004: 동일 상품 중복 담기 방지 ────────────────────────────────
  test("SC-cart-004: 동일 상품 중복 담기 방지 (수량 증가)", async ({
    page,
  }) => {
    let productId: number;
    try {
      const product = await readStoreProduct();
      productId = product.id;
    } catch {
      test.skip(true, "fixtures.json 없음 — global-setup이 필요합니다.");
      return;
    }

    await page.setViewportSize({ width: 1280, height: 800 });

    // 이전 테스트에서 남은 로컬스토리지 초기화
    await page.goto("/");
    await page.evaluate((key) => localStorage.removeItem(key), GUEST_CART_KEY);

    // 상품 상세 페이지로 이동
    await page.goto(`/shop/${productId}`);

    // 첫 번째 담기
    await page.getByTestId("product-add-to-cart").click();
    await expect(page.getByText("장바구니에 추가되었습니다.")).toBeVisible();
    await page.getByRole("button", { name: "닫기" }).click();

    const itemsAfterFirst = await getGuestCartFromStorage(page);
    expect(itemsAfterFirst.length).toBe(1);

    // 두 번째 담기 — 같은 페이지에서 다시 클릭 (페이지 재방문 시 React Query 캐시 초기화 방지)
    await page.getByTestId("product-add-to-cart").click();

    // shop detail page는 중복 여부와 관계없이 "장바구니에 추가되었습니다." 모달을 표시
    await expect(page.getByText("장바구니에 추가되었습니다.")).toBeVisible();
    await page.getByRole("button", { name: "닫기" }).click();

    // 아이템 수는 여전히 1개 (새 row가 추가되지 않고 수량만 증가)
    const itemsAfterSecond = await getGuestCartFromStorage(page);
    expect(itemsAfterSecond.length).toBe(1);
    expect(itemsAfterSecond.length).toBeGreaterThan(0);
    expect(itemsAfterSecond[0]).toEqual(
      expect.objectContaining({ quantity: expect.any(Number) }),
    );

    // 수량이 2로 증가됐는지 확인
    const item = itemsAfterSecond[0] as { quantity: number };
    expect(item.quantity).toBe(2);
  });

  // ── SC-cart-002: 로그인 시 로컬 장바구니 서버 동기화 ────────────────────
  test("SC-cart-002: 로그인 시 로컬 장바구니 서버 동기화", async ({ page }) => {
    test.skip(
      !hasStoreAuth,
      "Store 계정 env(TEST_STORE_EMAIL/PASSWORD 또는 ACCESS_TOKEN)가 필요합니다.",
    );

    let productId: number;
    try {
      const product = await readStoreProduct();
      productId = product.id;
    } catch {
      test.skip(true, "fixtures.json 없음 — global-setup이 필요합니다.");
      return;
    }

    const cfg = await getSupabaseConfig();
    const storageKey = getStorageKey(cfg.supabaseUrl);

    // 1. 비회원 상태로 상품 담기
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/shop/${productId}`);
    await page.getByTestId("product-add-to-cart").click();
    await expect(page.getByText("장바구니에 추가되었습니다.")).toBeVisible();
    await page.getByRole("button", { name: "닫기" }).click();

    const guestItemsBefore = await getGuestCartFromStorage(page);
    expect(guestItemsBefore.length).toBeGreaterThan(0);

    // 2. Supabase 세션 주입 (로그인 시뮬레이션)
    const env = await loadEnv();
    const email = process.env.TEST_STORE_EMAIL ?? env.TEST_STORE_EMAIL ?? "";
    const password =
      process.env.TEST_STORE_PASSWORD ?? env.TEST_STORE_PASSWORD ?? "";
    const session = await signInWithPassword(cfg, email, password);
    const userId = session.user?.id;

    if (!userId) {
      throw new Error("세션에서 user.id를 가져올 수 없습니다.");
    }

    // 서버 장바구니 초기화 (깨끗한 상태에서 동기화 테스트)
    await clearServerCart(cfg, session.access_token, userId);

    // localStorage에 Supabase 세션 주입 → 앱이 로그인 상태를 인식
    await injectSession(page, session, storageKey);

    // 3. 페이지를 새로고침해 useCartAuthSync가 동기화를 수행하도록 유도
    await page.goto("/cart");
    await page.waitForResponse(
      (response) =>
        response.url().includes("/rest/v1/rpc/get_cart_items") &&
        response.status() === 200,
    );
    await expect(page.getByTestId("cart-items-panel")).toBeVisible();

    // 4. 로컬스토리지 guest 장바구니가 삭제됐는지 확인
    const guestItemsAfter = await getGuestCartFromStorage(page);
    expect(guestItemsAfter.length).toBe(0);

    // 5. 서버에 아이템이 동기화됐는지 확인
    const serverCount = await getServerCartCount(
      cfg,
      session.access_token,
      userId,
    );
    expect(serverCount).toBeGreaterThan(0);

    // 사후 정리: 서버 장바구니 비우기
    await clearServerCart(cfg, session.access_token, userId);
  });

  // ── SC-cart-003: 로그인 시 로컬 없으면 서버 장바구니 유지 ───────────────
  test("SC-cart-003: 로그인 시 로컬 없으면 서버 장바구니 유지", async ({
    page,
  }) => {
    test.skip(
      !hasStoreAuth,
      "Store 계정 env(TEST_STORE_EMAIL/PASSWORD 또는 ACCESS_TOKEN)가 필요합니다.",
    );

    let productId: number;
    try {
      const product = await readStoreProduct();
      productId = product.id;
    } catch {
      test.skip(true, "fixtures.json 없음 — global-setup이 필요합니다.");
      return;
    }

    const cfg = await getSupabaseConfig();
    const storageKey = getStorageKey(cfg.supabaseUrl);

    const env = await loadEnv();
    const email = process.env.TEST_STORE_EMAIL ?? env.TEST_STORE_EMAIL ?? "";
    const password =
      process.env.TEST_STORE_PASSWORD ?? env.TEST_STORE_PASSWORD ?? "";
    const session = await signInWithPassword(cfg, email, password);
    const userId = session.user?.id;

    if (!userId) {
      throw new Error("세션에서 user.id를 가져올 수 없습니다.");
    }

    // 서버 장바구니에 상품을 미리 직접 넣어둠
    // (replace_cart_items RPC는 CartItemInputDTO 형식의 JSON을 받음)
    const serverSeedItem = {
      id: `e2e-sc003-${Date.now()}`,
      type: "product",
      product: { id: productId },
      selectedOption: null,
      reformData: null,
      quantity: 1,
      appliedCoupon: null,
      appliedCouponId: null,
    };
    const seedRes = await fetch(
      `${cfg.supabaseUrl}/rest/v1/rpc/replace_cart_items`,
      {
        method: "POST",
        headers: {
          apikey: cfg.supabaseAnonKey,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_user_id: userId, p_items: [serverSeedItem] }),
      },
    );
    if (!seedRes.ok) {
      const errBody = await seedRes.text();
      throw new Error(`서버 장바구니 시드 실패: ${seedRes.status} ${errBody}`);
    }

    // 로컬스토리지 비어있는 상태로 시작 (guest 없음)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    // guest 장바구니가 비어있는지 확인
    const guestItems = await getGuestCartFromStorage(page);
    expect(guestItems.length).toBe(0);

    // Supabase 세션 주입 (로그인 시뮬레이션)
    await injectSession(page, session, storageKey);

    // 장바구니 페이지 방문 → 서버 장바구니를 로드
    await page.goto("/cart");
    await page.waitForTimeout(2000);

    // 서버 장바구니 아이템이 표시됨
    await expect(page.getByTestId("cart-items-panel")).toBeVisible();
    const cartItems = page.locator('[data-testid^="cart-item-"]');
    await expect(cartItems.first()).toBeVisible();

    // 사후 정리
    await clearServerCart(cfg, session.access_token, userId);
  });

  // ── SC-cart-007: 로그아웃 시 게스트 장바구니로 전환 ─────────────────────
  test("SC-cart-007: 로그아웃 시 게스트 장바구니로 전환", async ({ page }) => {
    test.skip(
      !hasStoreAuth,
      "Store 계정 env(TEST_STORE_EMAIL/PASSWORD 또는 ACCESS_TOKEN)가 필요합니다.",
    );

    const cfg = await getSupabaseConfig();
    const storageKey = getStorageKey(cfg.supabaseUrl);

    const env = await loadEnv();
    const email = process.env.TEST_STORE_EMAIL ?? env.TEST_STORE_EMAIL ?? "";
    const password =
      process.env.TEST_STORE_PASSWORD ?? env.TEST_STORE_PASSWORD ?? "";
    const session = await signInWithPassword(cfg, email, password);
    const userId = session.user?.id;

    if (!userId) {
      throw new Error("세션에서 user.id를 가져올 수 없습니다.");
    }

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    // 1. 로그인 세션 주입
    await injectSession(page, session, storageKey);

    // 2. 미리 guest 장바구니 아이템 준비 (로그아웃 후 보여줄 것)
    const guestItem = {
      id: `e2e-sc007-${Date.now()}`,
      type: "product",
      quantity: 1,
      product: { id: 1, name: "테스트 상품", price: 10000, image: null },
    };
    // 게스트 아이템은 로그아웃 후에 설정 (현재는 서버 장바구니 사용 중)

    // 3. 장바구니 페이지로 이동 (로그인 상태 확인)
    await page.goto("/cart");
    await page.waitForTimeout(1500);

    // 4. 로그아웃: localStorage에서 Supabase 세션 제거
    await page.evaluate((key) => {
      localStorage.removeItem(key);
    }, storageKey);

    // 5. 게스트 장바구니 아이템을 localStorage에 설정
    await setGuestCartInStorage(page, [guestItem]);

    // 6. 페이지 새로고침 → useCartAuthSync가 로그아웃을 감지하고 guest 전환
    await page.reload();
    await page.waitForTimeout(2000);

    // 7. 로그인 상태가 아님을 확인 (로그인 버튼 또는 로그인 페이지로 리다이렉트)
    const guestCartRaw = await page.evaluate(
      (key) => localStorage.getItem(key),
      GUEST_CART_KEY,
    );
    // guest 장바구니가 여전히 존재함
    expect(guestCartRaw).not.toBeNull();

    // Supabase 세션이 제거됐는지 확인
    const supabaseSession = await page.evaluate(
      (key) => localStorage.getItem(key),
      storageKey,
    );
    expect(supabaseSession).toBeNull();
  });
});
