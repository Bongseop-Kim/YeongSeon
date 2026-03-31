import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const fromRepoRoot = (...segments: string[]) =>
  resolve(import.meta.dirname, "../../../../", ...segments);

const readRepoFile = (...segments: string[]) =>
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  readFileSync(fromRepoRoot(...segments), "utf8");

function extractViewBlock(sql: string, viewName: string): string {
  const marker = `CREATE OR REPLACE VIEW public.${viewName}`;
  const start = sql.indexOf(marker);
  if (start === -1) throw new Error(`View not found: ${viewName}`);
  const end = sql.indexOf(";", start);
  return sql.slice(start, end + 1);
}

function extractFunctionBlock(sql: string, funcName: string): string {
  const marker = `CREATE OR REPLACE FUNCTION public.${funcName}`;
  const start = sql.indexOf(marker);
  if (start === -1) throw new Error(`Function not found: ${funcName}`);
  const end = sql.indexOf("$$;", start);
  return sql.slice(start, end + 3);
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

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
    const orderDetailBlock = normalize(
      extractViewBlock(viewsSql, "order_detail_view"),
    );

    expect(orderApi).toContain('"companyCourierCompany"');
    expect(orderApi).toContain('"companyTrackingNumber"');
    expect(orderApi).toContain('"companyShippedAt"');

    expect(orderViewDto).toContain("companyCourierCompany: string | null;");
    expect(orderViewDto).toContain("companyTrackingNumber: string | null;");
    expect(orderViewDto).toContain("companyShippedAt: string | null;");

    expect(orderDetailBlock).toContain(
      'o.company_courier_company AS "companyCourierCompany"',
    );
    expect(orderDetailBlock).toContain(
      'o.company_tracking_number AS "companyTrackingNumber"',
    );
    expect(orderDetailBlock).toContain(
      'o.company_shipped_at AS "companyShippedAt"',
    );
  });

  it("tracking follow-up SQL uses the expected return key and company fields", () => {
    const orderFunctionsSql = readRepoFile(
      "supabase",
      "schemas",
      "93_functions_orders.sql",
    );
    const viewsSql = readRepoFile("supabase", "schemas", "90_views.sql");

    const autoConfirmBlock = normalize(
      extractFunctionBlock(orderFunctionsSql, "auto_confirm_delivered_orders"),
    );
    const orderDetailBlock = normalize(
      extractViewBlock(viewsSql, "order_detail_view"),
    );

    expect(autoConfirmBlock).toContain("'confirmed_count', v_count");
    expect(orderDetailBlock).toContain('AS "companyCourierCompany"');
    expect(orderDetailBlock).toContain('AS "companyTrackingNumber"');
    expect(orderDetailBlock).toContain('AS "companyShippedAt"');
  });

  it("admin tracking function updates orders atomically and clears shipped timestamps when invoices are removed", () => {
    const adminFunctionsSql = readRepoFile(
      "supabase",
      "schemas",
      "97_functions_admin.sql",
    );
    const trackingFunctionBlock = normalize(
      extractFunctionBlock(adminFunctionsSql, "admin_update_order_tracking"),
    );

    expect(trackingFunctionBlock).toContain(
      "where id = p_order_id and status not in ('배송완료', '완료', '취소')",
    );
    expect(trackingFunctionBlock).toContain(
      "returning status into v_order_status",
    );
    expect(trackingFunctionBlock).toContain(
      "when p_tracking_number is not null and v_tracking_number is null then null",
    );
    expect(trackingFunctionBlock).toContain(
      "when p_company_tracking_number is not null and v_company_tracking_number is null then null",
    );
  });
});
