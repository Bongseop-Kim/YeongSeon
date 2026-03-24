/** @type {import('dependency-cruiser').IForbiddenRuleType[]} */
const forbidden = [
  {
    name: "no-circular",
    severity: "error",
    comment: "순환 의존성 감지",
    from: {},
    to: { circular: true },
  },
  {
    name: "no-orphans",
    severity: "warn",
    comment: "고아 모듈 감지",
    from: {
      orphan: true,
      pathNot: [
        "(^|/)\\.[^/]+", // dotfiles
        "\\.d\\.ts$",
        "(^|/)tsconfig",
        "(^|/)vite\\.config",
        "(^|/)vitest",
        "(^|/)eslint\\.config",
        "main\\.tsx$",
        "App\\.tsx$",
        "vite-env\\.d\\.ts$",
        "\\.test\\.",
        "\\.spec\\.",
        "__test__",
        "/test/",
      ],
    },
    to: {},
  },
  // 1. 기본: 특수 처리 feature 외 모든 feature에서 cross-feature import 금지
  {
    name: "no-cross-feature-imports",
    severity: "error",
    comment: "별도 규칙이 없는 feature는 다른 feature를 직접 import할 수 없다.",
    from: {
      path: "^src/features/([^/]+)/",
      pathNot: "^src/features/(order|cart|custom-order|claim|quote-request|my-page|home|payment|auth|token-purchase|shop|sample-order|reform)/",
    },
    to: {
      path: "^src/features/([^/]+)/",
      pathNot: "^src/features/$1/",
    },
  },
  // 2. 주문 생태계: order/cart/custom-order는 shipping/coupon/reform/quote-request/shop/my-page만 참조 허용
  {
    name: "no-cross-feature-order-ecosystem",
    severity: "error",
    comment: "order/cart/custom-order는 주문 흐름 보조 feature(shipping·coupon·reform·quote-request·shop·my-page)만 참조 허용",
    from: { path: "^src/features/(order|cart|custom-order)/" },
    to: {
      path: "^src/features/([^/]+)/",
      pathNot: "^src/features/(order|cart|custom-order|shipping|coupon|reform|quote-request|shop|my-page)/",
    },
  },
  // 3. claim → order 단방향 허용
  {
    name: "no-cross-feature-claim",
    severity: "error",
    comment: "claim은 order에만 단방향 의존 허용",
    from: { path: "^src/features/claim/" },
    to: {
      path: "^src/features/([^/]+)/",
      pathNot: "^src/features/(claim|order)/",
    },
  },
  // 4. quote-request → custom-order 단방향 허용
  {
    name: "no-cross-feature-quote-request",
    severity: "error",
    comment: "quote-request는 custom-order 데이터 변환을 위해 단방향 의존 허용",
    from: { path: "^src/features/quote-request/" },
    to: {
      path: "^src/features/([^/]+)/",
      pathNot: "^src/features/(quote-request|custom-order)/",
    },
  },
  // 5. my-page → auth/design/quote-request 허용 (aggregator)
  {
    name: "no-cross-feature-my-page",
    severity: "error",
    comment: "my-page는 사용자 정보(auth)·디자인토큰(design)·견적(quote-request)만 참조 허용",
    from: { path: "^src/features/my-page/" },
    to: {
      path: "^src/features/([^/]+)/",
      pathNot: "^src/features/(my-page|auth|design|quote-request)/",
    },
  },
  // 6. home → shop 허용
  {
    name: "no-cross-feature-home",
    severity: "error",
    comment: "home 페이지는 상품 목록 표시를 위해 shop만 참조 허용",
    from: { path: "^src/features/home/" },
    to: {
      path: "^src/features/([^/]+)/",
      pathNot: "^src/features/(home|shop)/",
    },
  },
  // 7. payment → cart 허용 (결제 성공 후 장바구니 초기화)
  {
    name: "no-cross-feature-payment",
    severity: "error",
    comment: "payment는 결제 성공 후 cart 초기화를 위해 cart만 참조 허용",
    from: { path: "^src/features/payment/" },
    to: {
      path: "^src/features/([^/]+)/",
      pathNot: "^src/features/(payment|cart)/",
    },
  },
  // 8. auth → design 허용 (로그인/로그아웃 시 디자인 토큰 캐시 무효화)
  {
    name: "no-cross-feature-auth",
    severity: "error",
    comment: "auth는 로그인 상태 변경 시 design 토큰 캐시 무효화를 위해 design만 참조 허용",
    from: { path: "^src/features/auth/" },
    to: {
      path: "^src/features/([^/]+)/",
      pathNot: "^src/features/(auth|design)/",
    },
  },
  // 9. token-purchase → payment/design 허용 (토큰 구매 흐름)
  {
    name: "no-cross-feature-token-purchase",
    severity: "error",
    comment: "token-purchase는 결제(payment)·디자인토큰 잔액 갱신(design)만 참조 허용",
    from: { path: "^src/features/token-purchase/" },
    to: {
      path: "^src/features/([^/]+)/",
      pathNot: "^src/features/(token-purchase|payment|design)/",
    },
  },
  // 10. shop → cart 허용 (상품 상세에서 장바구니 담기)
  {
    name: "no-cross-feature-shop",
    severity: "error",
    comment: "shop은 장바구니 담기를 위해 cart만 참조 허용",
    from: { path: "^src/features/shop/" },
    to: {
      path: "^src/features/([^/]+)/",
      pathNot: "^src/features/(shop|cart)/",
    },
  },
  // 11. sample-order → shipping/custom-order 허용 (샘플 주문 흐름)
  {
    name: "no-cross-feature-sample-order",
    severity: "error",
    comment: "sample-order는 배송지(shipping)·이미지 업로드 및 가격 설정(custom-order)만 참조 허용",
    from: { path: "^src/features/sample-order/" },
    to: {
      path: "^src/features/([^/]+)/",
      pathNot: "^src/features/(sample-order|shipping|custom-order)/",
    },
  },
  // 12. reform → cart 허용 (리폼 주문 시 장바구니 연동)
  {
    name: "no-cross-feature-reform",
    severity: "error",
    comment: "reform은 장바구니 연동을 위해 cart만 참조 허용",
    from: { path: "^src/features/reform/" },
    to: {
      path: "^src/features/([^/]+)/",
      pathNot: "^src/features/(reform|cart)/",
    },
  },
  {
    name: "no-shared-to-apps",
    severity: "error",
    comment: "packages/shared는 apps를 import할 수 없습니다.",
    from: { path: "^packages/shared/" },
    to: { path: "^apps/" },
  },
  {
    name: "no-supabase-pkg-to-apps",
    severity: "error",
    comment: "packages/supabase는 apps를 import할 수 없습니다.",
    from: { path: "^packages/supabase/" },
    to: { path: "^apps/" },
  },
  {
    name: "no-dev-deps-in-production",
    severity: "error",
    comment: "프로덕션 코드에서 devDependencies import 금지",
    from: {
      path: "^src/",
      pathNot: ["\\.test\\.", "\\.spec\\.", "__test__", "/test/"],
    },
    to: { dependencyTypes: ["npm-dev"] },
  },
  {
    name: "no-supabase-outside-api-layer",
    severity: "error",
    comment:
      "Supabase 클라이언트 직접 호출은 features/*/api/, lib/, providers/에서만 허용",
    from: {
      path: "^src/",
      pathNot: [
        "^src/features/[^/]+/api/",
        "^src/lib/",
        "^src/providers/",
      ],
    },
    to: { path: "@yeongseon/supabase" },
  },
];

module.exports = { forbidden };
