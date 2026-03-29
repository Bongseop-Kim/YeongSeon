import rootConfig from "../../eslint.config.js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
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
  createAbsoluteImportConfig([
    "src/features/**/*.{ts,tsx}",
    "src/components/**/*.{ts,tsx}",
  ]),
  createMapperImportConfig([
    "src/components/**/*.{ts,tsx}",
    "src/hooks/**/*.{ts,tsx}",
  ]),
]);
