import { mergeConfig, defineConfig } from "vitest/config";
import viteConfig from "./vite.config";
import { baseVitestTestConfig } from "../../vitest.base.js";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      ...baseVitestTestConfig,
      env: {
        VITE_SUPABASE_URL: "https://placeholder.supabase.co",
        VITE_SUPABASE_ANON_KEY: "placeholder-anon-key",
      },
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
          "src/shared/ui/**",
          "src/shared/composite/**",
          "src/shared/layout/**",
          "src/**/components/**/*.tsx",
          "src/**/page.tsx",
          "src/**/pages/**/*.tsx",
          "src/pages/**",
          "src/widgets/**",
          // 인프라
          "src/app/layout/**",
          "src/app/providers/**",
          "src/app/router/**",
          "src/store/**",
          "src/**/store/**",
          // 타입 선언 파일
          "src/**/*.d.ts",
          // 타입 전용
          "src/**/types/**",
          "src/**/model/**",
          // 타입 전용 파일 (런타임 코드 없음)
          "src/**/*-types.ts",
          // FSD public API 배럴 (re-export 전용)
          "src/**/index.ts",
          // 외부 서비스 초기화/래퍼
          "src/shared/lib/supabase.ts",
          "src/shared/lib/imagekit.ts",
          "src/shared/lib/query-client.ts",
          "src/shared/lib/toast.ts",
          "src/shared/lib/utils.ts",
          "src/shared/lib/type-guard.ts",
          "src/shared/ui-extended/**",
          "src/features/design/utils/imagekit-upload.ts",
          // 애니메이션 상수 전용 (런타임 로직 없음)
          "src/features/home/components/home-motion.ts",
          // 얇은 React Query mutation 래퍼
          "src/features/reform/hooks/useUploadTieImages.ts",
          // 얇은 래퍼 / re-export 전용
          "src/features/order/custom-payment/types.ts",
          // entities 레이어 (API 파일과 함께 인프라 레이어로 처리 — features에 동등한 mapper가 별도 존재)
          "src/entities/**",
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
