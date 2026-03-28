import { mergeConfig, defineConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      clearMocks: true,
      restoreMocks: true,
      projects: [
        {
          extends: true,
          test: {
            name: "store-node",
            environment: "node",
            include: ["src/**/*.test.ts"],
          },
        },
        {
          extends: true,
          test: {
            name: "store-jsdom",
            environment: "jsdom",
            setupFiles: ["./src/test/setup.ts"],
            include: ["src/**/*.test.tsx"],
          },
        },
      ],
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "lcov", "json-summary", "json"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          // 테스트/설정
          "src/**/*.test.{ts,tsx}",
          "src/test/**",
          "src/vite-env.d.ts",
          "src/main.tsx",
          "src/App.tsx",
          // UI (컴포넌트 테스트는 별도 측정 가능)
          "src/components/ui/**",
          "src/**/components/**/*.tsx",
          "src/**/page.tsx",
          "src/**/pages/**/*.tsx",
          // 인프라
          "src/providers/**",
          "src/routes/**",
          "src/store/**",
          "src/**/store/**",
          // 타입 전용
          "src/**/types/**",
          // 타입 전용 파일 (런타임 코드 없음)
          "src/**/*-types.ts",
          // 외부 서비스 초기화/래퍼
          "src/lib/supabase.ts",
          "src/lib/imagekit.ts",
          "src/lib/query-client.ts",
          "src/lib/toast.ts",
          "src/lib/utils.ts",
          "src/features/design/api/imagekit-upload.ts",
          // 얇은 래퍼 / re-export 전용
          "src/features/order/custom-payment/storage.ts",
          "src/features/order/custom-payment/types.ts",
          // API 레이어 (Supabase 직접 호출)
          "src/**/*-api.ts",
          "src/**/*-query.ts",
          "src/**/*-keys.ts",
          // 상수
          "src/**/constants/**",
        ],
        thresholds: {
          lines: 80,
          branches: 80,
          functions: 80,
          statements: 80,
        },
      },
    },
  }),
);
