import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";
import prettierConfig from "eslint-config-prettier";
import security from "eslint-plugin-security";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config([
  globalIgnores(["**/dist", "**/node_modules"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      security.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
    },
    linterOptions: {
      // "off"로 명시: ESLint 기본값(warn)이 lint-staged --fix 실행 시 앱 전용 규칙(react-hooks 등)
      // 비활성화 상태에서 valid한 eslint-disable 주석을 auto-remove하는 것을 방지.
      // 실제 unused directive 차단은 각 앱 eslint.config.js의 linterOptions로 설정.
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "interface", format: ["PascalCase"] },
        { selector: "typeAlias", format: ["PascalCase"] },
        { selector: "enum", format: ["PascalCase"] },
        { selector: "enumMember", format: ["UPPER_CASE", "PascalCase"] },
      ],
      // false positive가 많아 off 처리
      "security/detect-object-injection": "off",
    },
  },
  {
    // react-hooks, react-refresh 플러그인 규칙명이 루트 config에서 인식되도록 등록
    // (규칙 활성화 없이 등록만 — eslint-disable 주석의 "rule not found" 오류 방지)
    files: ["apps/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
  },
  prettierConfig,
]);
