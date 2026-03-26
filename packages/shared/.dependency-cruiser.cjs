const { forbidden } = require("../../.dependency-cruiser.base.cjs");

// packages/shared는 라이브러리 패키지 — named exports 파일들이 외부 앱에서 참조되므로
// no-orphans를 warn으로 낮춰 false positive 방지
const sharedForbidden = forbidden.map((rule) => {
  if (rule.name !== "no-orphans") return rule;
  return { ...rule, severity: "warn" };
});

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: sharedForbidden,
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
