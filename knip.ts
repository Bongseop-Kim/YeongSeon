import type { KnipConfig } from "knip";

const config: KnipConfig = {
  // preinstall/scripts에서 npx로 실행되는 바이너리
  ignoreBinaries: ["supabase", "only-allow"],
  // CSS 전용 패키지 — TypeScript import 없이 CSS에서 직접 사용
  ignoreDependencies: ["tailwindcss", "tw-animate-css"],

  workspaces: {
    ".": {
      // e2e 스펙 파일은 pnpm workspace 밖에서 playwright가 직접 실행하므로 명시 필요
      entry: ["e2e/**/*.spec.ts", "e2e/fixtures/**/*.ts"],
      project: ["e2e/**/*.ts"],
    },

    "apps/store": {
      // shadcn/ui 컴포넌트는 모든 sub-parts를 export하는 관례 → entry로 등록해 public API 처리
      // model-viewer.d.ts: @google/model-viewer는 React JSX 타입을 제공하지 않으므로 별도 선언 필요
      entry: ["src/components/**/*.{ts,tsx}", "src/model-viewer.d.ts"],
      project: ["src/**/*.{ts,tsx}"],
    },

    "apps/admin": {
      project: ["src/**/*.{ts,tsx}"],
    },

    "packages/shared": {
      project: ["src/**/*.ts"],
    },

    "packages/supabase": {
      project: ["src/**/*.ts"],
    },

    "packages/tsconfig": {
      entry: [],
      project: [],
    },
  },
};

export default config;
