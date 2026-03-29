/** @type {import('dependency-cruiser').IForbiddenRuleType[]} */
const forbidden = [
  {
    name: "no-circular",
    severity: "error",
    comment: "순환 의존성 금지",
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
        "(^|/)\\.[^/]+",
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

  {
    name: "fsd-shared-no-upper-layers",
    severity: "error",
    comment: "shared 레이어는 다른 레이어를 import할 수 없다",
    from: { path: "^src/shared/" },
    to: { path: "^src/(app|pages|widgets|features|entities)/" },
  },
  {
    name: "fsd-entities-no-upper-layers",
    severity: "error",
    comment: "entities는 features/widgets/pages/app을 import할 수 없다",
    from: { path: "^src/entities/" },
    to: { path: "^src/(app|pages|widgets|features)/" },
  },
  {
    name: "fsd-features-no-upper-layers",
    severity: "error",
    comment: "features는 widgets/pages/app을 import할 수 없다",
    from: { path: "^src/features/" },
    to: { path: "^src/(app|pages|widgets)/" },
  },
  {
    name: "fsd-widgets-no-upper-layers",
    severity: "error",
    comment: "widgets는 pages/app을 import할 수 없다",
    from: { path: "^src/widgets/" },
    to: { path: "^src/(app|pages)/" },
  },
  {
    name: "fsd-pages-no-app-layer",
    severity: "error",
    comment: "pages는 app 레이어를 import할 수 없다",
    from: { path: "^src/pages/" },
    to: { path: "^src/app/" },
  },

  {
    name: "fsd-features-no-cross-slice",
    severity: "error",
    comment: "features 레이어 내 다른 feature slice를 직접 import 금지",
    from: { path: "^src/features/([^/]+)/" },
    to: {
      path: "^src/features/",
      pathNot: "^src/features/$1/",
    },
  },
  {
    name: "fsd-widgets-no-cross-slice",
    severity: "error",
    comment: "widgets 레이어 내 다른 widget slice를 import 금지",
    from: { path: "^src/widgets/([^/]+)/" },
    to: {
      path: "^src/widgets/",
      pathNot: "^src/widgets/$1/",
    },
  },
  {
    name: "fsd-entities-no-cross-slice",
    severity: "error",
    comment:
      "entities 내 cross-slice 금지. 허용: quote-request→custom-order, auth→design, token-purchase→{payment,design}, my-page→{auth,design}, claim→order",
    from: {
      path: "^src/entities/([^/]+)/",
      pathNot: "^src/entities/(quote-request|auth|token-purchase|my-page|claim)/",
    },
    to: {
      path: "^src/entities/",
      pathNot: "^src/entities/$1/",
    },
  },

  {
    name: "fsd-entities-public-api",
    severity: "error",
    comment: "entities 내부 파일은 index.ts를 통해서만 접근",
    from: {
      path: "^src/",
      pathNot: "^src/entities/",
    },
    to: {
      path: "^src/entities/([^/]+)/(?!index\\.ts)",
    },
  },
  {
    name: "fsd-features-public-api",
    severity: "error",
    comment: "features 내부 파일은 index.ts를 통해서만 접근 (widgets, pages, app에서)",
    from: { path: "^src/(widgets|pages|app)/" },
    to: {
      path: "^src/features/([^/]+)/(?!index\\.ts)",
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
      "Supabase 클라이언트 직접 호출은 entities/*/api/, features/*/api/, shared/lib/, app/providers/ 에서만 허용",
    from: {
      path: "^src/",
      pathNot: [
        "^src/entities/[^/]+/api/",
        "^src/features/[^/]+/api/",
        "^src/shared/lib/",
        "^src/app/providers/",
      ],
    },
    to: { path: "@yeongseon/supabase" },
  },
];

module.exports = { forbidden };
