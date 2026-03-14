import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";
import prettierConfig from "eslint-config-prettier";
import security from "eslint-plugin-security";
import reactHooks from "eslint-plugin-react-hooks";

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
      // 각 패키지 config의 플러그인 규칙(react-hooks 등)이 루트 config에 없어
      // 발생하는 "Definition for rule not found" 오류 억제
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
      // false positive가 많아 off 처리
      "security/detect-object-injection": "off",
    },
  },
  {
    // react-hooks 플러그인 규칙명이 루트 config에서 인식되도록 등록
    // (규칙 활성화 없이 등록만 — eslint-disable 주석의 "rule not found" 오류 방지)
    files: ["apps/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
  },
  prettierConfig,
]);
