const { forbidden } = require("../../.dependency-cruiser.base.cjs");

// packages/supabase는 feature 분리 규칙 불필요 — 순환 의존성과 devDep 혼입만 검사
const supabaseForbidden = forbidden.filter((rule) =>
  ["no-circular", "no-dev-deps-in-production"].includes(rule.name)
);

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: supabaseForbidden,
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
