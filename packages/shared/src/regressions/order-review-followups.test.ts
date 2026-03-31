import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const fromRepoRoot = (...segments: string[]) =>
  resolve(import.meta.dirname, "../../../../", ...segments);

const readRepoFile = (...segments: string[]) =>
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  readFileSync(fromRepoRoot(...segments), "utf8");

describe("review follow-up regressions", () => {
  it("store order detail query and view expose 업체 발송 필드", () => {
    const orderApi = readRepoFile(
      "apps",
      "store",
      "src",
      "entities",
      "order",
      "api",
      "order-api.ts",
    );
    const orderViewDto = readRepoFile(
      "packages",
      "shared",
      "src",
      "types",
      "dto",
      "order-view.ts",
    );
    const viewsSql = readRepoFile("supabase", "schemas", "90_views.sql");

    expect(orderApi).toContain('"companyCourierCompany"');
    expect(orderApi).toContain('"companyTrackingNumber"');
    expect(orderApi).toContain('"companyShippedAt"');

    expect(orderViewDto).toContain("companyCourierCompany: string | null;");
    expect(orderViewDto).toContain("companyTrackingNumber: string | null;");
    expect(orderViewDto).toContain("companyShippedAt: string | null;");

    expect(viewsSql).toContain(
      'o.company_courier_company AS "companyCourierCompany"',
    );
    expect(viewsSql).toContain(
      'o.company_tracking_number AS "companyTrackingNumber"',
    );
    expect(viewsSql).toContain(
      'o.company_shipped_at      AS "companyShippedAt"',
    );
  });

  it("tracking follow-up SQL uses the expected return key and company fields", () => {
    const migrationSql = readRepoFile(
      "supabase",
      "migrations",
      "20260502000001_fix_review_followups_tracking_and_order_view.sql",
    );

    expect(migrationSql).toContain("'confirmed_count', v_count");
    expect(migrationSql).toContain('AS "companyCourierCompany"');
    expect(migrationSql).toContain('AS "companyTrackingNumber"');
    expect(migrationSql).toContain('AS "companyShippedAt"');
  });

  it("admin tracking function updates orders atomically and clears shipped timestamps when invoices are removed", () => {
    const adminFunctionsSql = readRepoFile(
      "supabase",
      "schemas",
      "97_functions_admin.sql",
    );

    expect(adminFunctionsSql).toContain(
      "where id = p_order_id\n    and status not in ('배송완료', '완료', '취소')",
    );
    expect(adminFunctionsSql).toContain("returning status into v_order_status");
    expect(adminFunctionsSql).toContain(
      "when p_tracking_number is not null and v_tracking_number is null\n        then null",
    );
    expect(adminFunctionsSql).toContain(
      "when p_company_tracking_number is not null\n        and v_company_tracking_number is null\n        then null",
    );
  });
});
