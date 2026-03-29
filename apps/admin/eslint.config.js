import rootConfig from "../../eslint.config.js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import {
  appDisableDirectiveConfig,
  createAbsoluteImportConfig,
  createMapperImportConfig,
} from "../../eslint.app-config.js";

export default tseslint.config([
  ...rootConfig,
  appDisableDirectiveConfig,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [reactHooks.configs["recommended-latest"]],
    languageOptions: {
      globals: globals.browser,
    },
  },
  createAbsoluteImportConfig([
    "src/features/**/*.{ts,tsx}",
    "src/components/**/*.{ts,tsx}",
  ]),
  {
    files: ["src/features/**/index.ts", "src/components/**/index.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  createMapperImportConfig([
    "src/components/**/*.{ts,tsx}",
    "src/hooks/**/*.{ts,tsx}",
  ]),
]);
