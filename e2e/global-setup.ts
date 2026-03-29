import type { FullConfig } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AppName, AuthMeta, E2EFixtures } from "@/e2e/utils/auth-support";
import { buildHeaders } from "@/e2e/utils/auth-support";

type SessionPayload = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: {
    id: string;
    email?: string;
  };
};

type StorageState = {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(__dirname, ".auth");
const fixturesFile = path.join(authDir, "fixtures.json");
const workspaceRoot = path.resolve(__dirname, "..");

const emptyStorageState = (): StorageState => ({
  cookies: [],
  origins: [],
});

const getBaseURLFromConfig = (config: FullConfig, projectName: AppName) => {
  const project = config.projects.find(
    (candidate) => candidate.name === projectName,
  );

  if (!project?.use?.baseURL || typeof project.use.baseURL !== "string") {
    throw new Error(`Missing baseURL for Playwright project "${projectName}".`);
  }

  return project.use.baseURL;
};

const getSupabaseProjectRef = (supabaseUrl: string) =>
  new URL(supabaseUrl).hostname.split(".")[0];

const getStorageKey = (supabaseUrl: string) =>
  `sb-${getSupabaseProjectRef(supabaseUrl)}-auth-token`;

const parseDotEnv = (content: string) => {
  const parsed: Record<string, string> = {};
  const unquoteEnvValue = (value: string) => {
    if (value.length < 2) {
      return value;
    }

    const quote = value[0];
    const isQuoted = (quote === '"' || quote === "'") && value.at(-1) === quote;

    if (!isQuoted) {
      return value;
    }

    const inner = value.slice(1, -1);
    const escapedQuote = new RegExp(`\\\\${quote}`, "g");

    return inner.replace(/\\\\/g, "\\").replace(escapedQuote, quote);
  };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = unquoteEnvValue(line.slice(separatorIndex + 1).trim());
    parsed[key] = value;
  }

  return parsed;
};

const loadAppEnv = async () => {
  const envFiles = [
    path.join(workspaceRoot, "apps/store/.env"),
    path.join(workspaceRoot, "apps/admin/.env"),
    path.join(__dirname, ".env"),
  ];

  const loaded: Record<string, string> = {};

  for (const envFile of envFiles) {
    try {
      const content = await fs.readFile(envFile, "utf8");
      Object.assign(loaded, parseDotEnv(content));
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code !== "ENOENT") {
        throw error;
      }
    }
  }

  for (const [key, value] of Object.entries(loaded)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return loaded;
};

const getSupabaseConfig = (fileEnv: Record<string, string>) => {
  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    fileEnv.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    fileEnv.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing SUPABASE_URL/SUPABASE_ANON_KEY. You can also reuse VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.",
    );
  }

  return { supabaseUrl, supabaseAnonKey };
};

const getSessionFromEnv = (appName: AppName): SessionPayload | null => {
  const prefix = appName.toUpperCase();
  const accessToken = process.env[`TEST_${prefix}_ACCESS_TOKEN`];
  const refreshToken = process.env[`TEST_${prefix}_REFRESH_TOKEN`];

  if (!accessToken || !refreshToken) {
    return null;
  }

  const expiresAt = process.env[`TEST_${prefix}_EXPIRES_AT`];
  const userId = process.env[`TEST_${prefix}_USER_ID`];
  const email = process.env[`TEST_${prefix}_EMAIL`];

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt ? Number(expiresAt) : undefined,
    token_type: "bearer",
    user: userId ? { id: userId, email } : undefined,
  };
};

const signInWithPassword = async (
  supabaseUrl: string,
  supabaseAnonKey: string,
  email: string,
  password: string,
) => {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: buildHeaders(supabaseAnonKey),
      body: JSON.stringify({ email, password }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase sign-in failed: ${response.status} ${body}`);
  }

  return (await response.json()) as SessionPayload;
};

const supabaseRequest = async <T>({
  supabaseUrl,
  path,
  anonKey,
  accessToken,
  method = "GET",
  body,
  preferRepresentation = false,
}: {
  supabaseUrl: string;
  path: string;
  anonKey: string;
  accessToken?: string;
  method?: string;
  body?: unknown;
  preferRepresentation?: boolean;
}): Promise<T> => {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      ...buildHeaders(anonKey, accessToken),
      ...(preferRepresentation ? { Prefer: "return=representation" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Supabase request failed: ${method} ${path} ${response.status} ${await response.text()}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

const createStorageState = (
  origin: string,
  storageKey: string,
  session: SessionPayload,
): StorageState => ({
  cookies: [],
  origins: [
    {
      origin,
      localStorage: [{ name: storageKey, value: JSON.stringify(session) }],
    },
  ],
});

const writeStorageState = async (
  appName: AppName,
  storageState: StorageState,
) => {
  await fs.mkdir(authDir, { recursive: true });
  await fs.writeFile(
    path.join(authDir, `${appName}.json`),
    JSON.stringify(storageState, null, 2),
  );
};

const writeAuthMeta = async (meta: AuthMeta) => {
  await fs.mkdir(authDir, { recursive: true });
  await fs.writeFile(
    path.join(authDir, `${meta.appName}.meta.json`),
    JSON.stringify(meta, null, 2),
  );
};

const writeFixtures = async (fixtures: E2EFixtures) => {
  await fs.mkdir(authDir, { recursive: true });
  await fs.writeFile(fixturesFile, JSON.stringify(fixtures, null, 2));
};

const resolveSession = async (
  appName: AppName,
  supabaseUrl: string,
  supabaseAnonKey: string,
) => {
  const directSession = getSessionFromEnv(appName);

  if (directSession) {
    return directSession;
  }

  const prefix = appName.toUpperCase();
  const email = process.env[`TEST_${prefix}_EMAIL`];
  const password = process.env[`TEST_${prefix}_PASSWORD`];

  if (!email || !password) {
    return null;
  }

  return signInWithPassword(supabaseUrl, supabaseAnonKey, email, password);
};

const getStoreProductFixture = async ({
  supabaseUrl,
  anonKey,
  serviceRoleKey,
  adminAccessToken,
}: {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey?: string;
  adminAccessToken?: string;
}) => {
  const withoutOptions = await supabaseRequest<
    Array<{ id: number; name: string; price: number }>
  >({
    supabaseUrl,
    anonKey,
    path: "/rest/v1/products?select=id,name,price&stock=gt.0&option_label=is.null&order=id.asc&limit=1",
  });

  if (withoutOptions.length > 0) {
    return withoutOptions[0];
  }

  const fallback = await supabaseRequest<
    Array<{ id: number; name: string; price: number }>
  >({
    supabaseUrl,
    anonKey,
    path: "/rest/v1/products?select=id,name,price&stock=gt.0&order=id.asc&limit=1",
  });

  if (fallback.length > 0) {
    return fallback[0];
  }

  if (!serviceRoleKey && !adminAccessToken) {
    throw new Error("No in-stock product found for E2E tests.");
  }

  const restockTarget = await supabaseRequest<
    Array<{ id: number; name: string; price: number }>
  >({
    supabaseUrl,
    anonKey,
    path: "/rest/v1/products?select=id,name,price&option_label=is.null&order=id.asc&limit=1",
  });

  if (restockTarget.length === 0) {
    throw new Error("No seedable product found for E2E tests.");
  }

  const restocked = await supabaseRequest<
    Array<{ id: number; name: string; price: number }>
  >({
    supabaseUrl,
    anonKey: serviceRoleKey ?? anonKey,
    accessToken: adminAccessToken,
    method: "PATCH",
    path: `/rest/v1/products?id=eq.${restockTarget[0].id}`,
    body: { stock: 100 },
    preferRepresentation: true,
  });

  if (restocked.length === 0) {
    throw new Error("Failed to restock product for E2E tests.");
  }

  return restocked[0];
};

const ensureDefaultShippingAddress = async ({
  supabaseUrl,
  anonKey,
  storeSession,
}: {
  supabaseUrl: string;
  anonKey: string;
  storeSession: SessionPayload;
}) => {
  const userId = storeSession.user?.id;

  if (!userId) {
    throw new Error("Store session is missing user information.");
  }

  const existing = await supabaseRequest<
    Array<{ id: string; recipient_name: string; is_default: boolean }>
  >({
    supabaseUrl,
    anonKey,
    accessToken: storeSession.access_token,
    path: `/rest/v1/shipping_addresses?select=id,recipient_name,is_default&user_id=eq.${userId}&order=created_at.desc`,
  });

  if (existing.length > 0) {
    const defaultAddress =
      existing.find((address) => address.is_default) ?? existing[0];

    return {
      id: defaultAddress.id,
      recipientName: defaultAddress.recipient_name,
    };
  }

  const created = await supabaseRequest<
    Array<{ id: string; recipient_name: string }>
  >({
    supabaseUrl,
    anonKey,
    accessToken: storeSession.access_token,
    method: "POST",
    path: "/rest/v1/shipping_addresses",
    preferRepresentation: true,
    body: [
      {
        user_id: userId,
        recipient_name: "Store E2E",
        recipient_phone: "01012345678",
        address: "서울특별시 강남구 테헤란로 123",
        address_detail: "101호",
        postal_code: "06142",
        is_default: true,
        delivery_request: "DELIVERY_REQUEST_1",
      },
    ],
  });

  return {
    id: created[0].id,
    recipientName: created[0].recipient_name,
  };
};

const ensureCouponForStoreUser = async ({
  supabaseUrl,
  anonKey,
  adminSession,
  storeSession,
}: {
  supabaseUrl: string;
  anonKey: string;
  adminSession: SessionPayload;
  storeSession: SessionPayload;
}) => {
  const storeUserId = storeSession.user?.id;

  if (!storeUserId) {
    throw new Error("Store session is missing user information.");
  }

  const couponName = "E2E 주문 쿠폰";
  const couponQueryName = encodeURIComponent(couponName);

  const existingCoupons = await supabaseRequest<
    Array<{ id: string; name: string; discount_value: number }>
  >({
    supabaseUrl,
    anonKey,
    accessToken: adminSession.access_token,
    path: `/rest/v1/coupons?select=id,name,discount_value&name=eq.${couponQueryName}&limit=1`,
  });

  const coupon =
    existingCoupons[0] ??
    (
      await supabaseRequest<
        Array<{ id: string; name: string; discount_value: number }>
      >({
        supabaseUrl,
        anonKey,
        accessToken: adminSession.access_token,
        method: "POST",
        path: "/rest/v1/coupons",
        preferRepresentation: true,
        body: [
          {
            name: couponName,
            discount_type: "fixed",
            discount_value: 1000,
            description: "E2E 테스트 전용 쿠폰",
            expiry_date: "2099-12-31",
            additional_info: "자동 시드된 테스트 쿠폰",
            is_active: true,
          },
        ],
      })
    )[0];

  const issuedCoupons = await supabaseRequest<Array<{ id: string }>>({
    supabaseUrl,
    anonKey,
    accessToken: adminSession.access_token,
    path: `/rest/v1/user_coupons?select=id&user_id=eq.${storeUserId}&coupon_id=eq.${coupon.id}&limit=1`,
  });

  if (issuedCoupons.length === 0) {
    await supabaseRequest({
      supabaseUrl,
      anonKey,
      accessToken: adminSession.access_token,
      method: "POST",
      path: "/rest/v1/user_coupons",
      body: [
        {
          user_id: storeUserId,
          coupon_id: coupon.id,
          status: "active",
          expires_at: "2099-12-31T23:59:59Z",
        },
      ],
    });
  }

  return {
    id: coupon.id,
    name: coupon.name,
    discountValue: coupon.discount_value,
  };
};

export default async function globalSetup(config: FullConfig) {
  const fileEnv = await loadAppEnv();
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig(fileEnv);
  const storageKey = getStorageKey(supabaseUrl);
  const resolvedSessions = new Map<
    AppName,
    { baseURL: string; session: SessionPayload }
  >();

  for (const appName of ["store", "admin"] as const) {
    const baseURL = getBaseURLFromConfig(config, appName);
    const session = await resolveSession(appName, supabaseUrl, supabaseAnonKey);

    if (!session) {
      console.warn(
        `[playwright] ${appName}: no TEST_${appName.toUpperCase()}_* auth credentials were provided. Writing an empty storageState.`,
      );
      await writeStorageState(appName, emptyStorageState());
      continue;
    }

    if (!session.user?.id) {
      throw new Error(
        `[playwright] ${appName}: session is missing user information.`,
      );
    }

    await writeStorageState(
      appName,
      createStorageState(baseURL, storageKey, session),
    );
    await writeAuthMeta({
      appName,
      baseURL,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      userId: session.user.id,
      email: session.user.email,
    });
    resolvedSessions.set(appName, { baseURL, session });
  }

  const storeContext = resolvedSessions.get("store");
  const adminContext = resolvedSessions.get("admin");

  if (storeContext && adminContext) {
    const [storeProduct, shippingAddress, coupon] = await Promise.all([
      getStoreProductFixture({
        supabaseUrl,
        anonKey: supabaseAnonKey,
        serviceRoleKey:
          process.env.SUPABASE_SERVICE_ROLE_KEY ??
          process.env.SUPABASE_SERVICE_ROLE,
        adminAccessToken: adminContext.session.access_token,
      }),
      ensureDefaultShippingAddress({
        supabaseUrl,
        anonKey: supabaseAnonKey,
        storeSession: storeContext.session,
      }),
      ensureCouponForStoreUser({
        supabaseUrl,
        anonKey: supabaseAnonKey,
        adminSession: adminContext.session,
        storeSession: storeContext.session,
      }),
    ]);

    await writeFixtures({
      storeProduct,
      shippingAddress,
      coupon,
    });
  }
}
