import { readAuthMeta, getSupabaseConfig, supabaseRequest } from "./store-data";

// ── 토큰 잔액 조회 (store 사용자) ────────────────────────────────────

export const getStoreTokenBalance = async (): Promise<{
  total: number;
  paid: number;
  bonus: number;
}> => {
  const storeMeta = await readAuthMeta("store");

  const data = await supabaseRequest<{
    total?: number;
    paid?: number;
    bonus?: number;
  } | null>({
    path: "/rest/v1/rpc/get_design_token_balance",
    method: "POST",
    accessToken: storeMeta.accessToken,
    body: {},
  });

  return {
    total: data?.total ?? 0,
    paid: data?.paid ?? 0,
    bonus: data?.bonus ?? 0,
  };
};

// ── 관리자로 토큰 직접 지급 ──────────────────────────────────────────

/**
 * 관리자 계정으로 특정 사용자에게 토큰을 지급합니다.
 *
 * 주의: manage_design_tokens_admin 함수가 DB에 두 개의 오버로딩 버전으로 존재하는 경우
 * Supabase REST API(PostgREST)에서 PGRST203 충돌이 발생할 수 있습니다.
 * 이 경우 DB에서 중복된 함수 버전을 제거해야 합니다.
 * 현재 환경에서 충돌이 발생하면 GRANT_TOKEN_UNAVAILABLE 에러를 throw합니다.
 */
export const GRANT_TOKEN_UNAVAILABLE = "GRANT_TOKEN_UNAVAILABLE";

export const grantTokensToUser = async (
  userId: string,
  amount: number,
  description = "E2E 테스트 토큰 지급",
): Promise<void> => {
  const adminMeta = await readAuthMeta("admin");
  const { supabaseUrl, supabaseAnonKey } = await getSupabaseConfig();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase env for E2E design helper.");
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/manage_design_tokens_admin`,
    {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${adminMeta.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_user_id: userId,
        p_amount: amount,
        p_description: description,
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    // PGRST203: 오버로딩 충돌 - DB에서 중복 함수를 제거해야 함
    if (errText.includes("PGRST203")) {
      const err = new Error(
        `manage_design_tokens_admin 오버로딩 충돌. DB에서 중복된 함수 버전을 제거하세요.`,
      );
      (err as Error & { code: string }).code = GRANT_TOKEN_UNAVAILABLE;
      throw err;
    }
    throw new Error(
      `manage_design_tokens_admin 실패: ${response.status} ${errText}`,
    );
  }
};

// ── store 사용자 토큰 초기화 (관리자로 차감) ──────────────────────────

export const resetStoreUserTokens = async (): Promise<void> => {
  const storeMeta = await readAuthMeta("store");
  const balance = await getStoreTokenBalance();

  if (balance.total > 0) {
    await grantTokensToUser(
      storeMeta.userId,
      -balance.total,
      "E2E 테스트 토큰 초기화",
    ).catch(() => {
      // 잔액이 이미 0이거나 오류 발생 시 무시
    });
  }
};
