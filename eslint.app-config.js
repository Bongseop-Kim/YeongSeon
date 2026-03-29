export const appDisableDirectiveConfig = {
  linterOptions: {
    reportUnusedDisableDirectives: "error",
  },
};

export const createAbsoluteImportConfig = (files) => ({
  files,
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["../*", "../../*", "../../../*", "../../../../*"],
            message: "교차 디렉터리 import는 @/ 절대경로를 사용하세요.",
          },
        ],
      },
    ],
  },
});

export const createMapperImportConfig = (files) => ({
  files,
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: [
              "@yeongseon/shared/mappers/*",
              "@yeongseon/shared/src/mappers/*",
            ],
            message:
              "매퍼는 API 계층(*-api.ts)에서만 호출하세요. 컴포넌트/훅에서 직접 import 금지.",
          },
        ],
      },
    ],
  },
});
