import { mergeConfig, defineConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "lcov", "json-summary"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          // 테스트/설정
          "src/**/*.test.{ts,tsx}",
          "src/test/**",
          "src/vite-env.d.ts",
          "src/main.tsx",
          "src/App.tsx",
          // UI
          "src/**/components/**/*.tsx",
          "src/pages/**",
          // 타입 전용
          "src/**/types/**",
          // 인프라
          "src/providers/**",
          "src/routes/**",
          // 외부 서비스 초기화
          "src/lib/supabase.ts",
          "src/lib/imagekit.ts",
          // API 레이어
          "src/**/*-api.ts",
          "src/**/*-query.ts",
          "src/**/*-keys.ts",
          // 상수
          "src/**/constants/**",
        ],
        thresholds: {
          lines: 80,
          branches: 77,
          functions: 71,
          statements: 80,
        },
      },
    },
  }),
);
