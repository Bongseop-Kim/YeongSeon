const { forbidden } = require("../../.dependency-cruiser.base.cjs");

const adminForbidden = forbidden.map((rule) => {
  if (rule.name !== "no-cross-feature-imports") return rule;
  return {
    ...rule,
    from: {
      ...rule.from,
      pathNot: [
        ...(Array.isArray(rule.from.pathNot)
          ? rule.from.pathNot
          : rule.from.pathNot
            ? [rule.from.pathNot]
            : []),
        "^src/features/(orders|dashboard)/",
      ],
    },
  };
});

// admin 전용: orders → settings, dashboard → quote-requests 허용
const adminAllowed = [
  {
    name: "no-cross-feature-admin-orders",
    severity: "error",
    comment: "admin orders는 settings 설정 조회를 위해 단방향 의존 허용",
    from: { path: "^src/features/orders/" },
    to: {
      path: "^src/features/([^/]+)/",
      pathNot: "^src/features/(orders|settings)/",
    },
  },
  {
    name: "no-cross-feature-admin-dashboard",
    severity: "error",
    comment:
      "admin dashboard는 견적 목록 표시를 위해 quote-requests만 참조 허용",
    from: { path: "^src/features/dashboard/" },
    to: {
      path: "^src/features/([^/]+)/",
      pathNot: "^src/features/(dashboard|quote-requests)/",
    },
  },
];

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [...adminForbidden, ...adminAllowed],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.app.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
