import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/test/**",
        "src/index.ts",
        // 타입 전용 (런타임 코드 없음)
        "src/types/**",
        // 상수
        "src/constants/**",
      ],
      thresholds: {
        lines: 80,
        branches: 88,
        functions: 96,
        statements: 80,
      },
    },
  },
});
