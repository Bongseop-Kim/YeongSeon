import rootConfig from "../../eslint.config.js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config([
  ...rootConfig,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [reactHooks.configs["recommended-latest"]],
    languageOptions: {
      globals: globals.browser,
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
              group: ["../../*", "../../../*", "../../../../*"],
              message: "교차 디렉터리 import는 @/ 절대경로를 사용하세요.",
            },
          ],
        },
      ],
    },
  },
]);
