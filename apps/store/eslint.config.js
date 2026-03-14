import rootConfig from "../../eslint.config.js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config([
  ...rootConfig,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
          allowExportNames: [
            "useBreakpoint",
            "useIsMobile",
            "useFormField",
            "badgeVariants",
            "buttonVariants",
            "buttonGroupVariants",
            "footerVariants",
            "headerVariants",
            "QUOTE_REQUEST_BADGE_CLASS",
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
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
  },
  {
    files: ["src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}"],
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
  },
]);
