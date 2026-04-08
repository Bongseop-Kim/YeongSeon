import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const scriptPath = resolve("scripts/check-sql-security.mjs");

function runSecurityCheck(sql) {
  const tempDir = mkdtempSync(join(tmpdir(), "sql-security-check-"));
  const sqlFile = join(tempDir, "fixture.sql");

  writeFileSync(sqlFile, sql);

  const result = spawnSync(process.execPath, [scriptPath, sqlFile], {
    encoding: "utf8",
  });

  rmSync(tempDir, { recursive: true, force: true });
  return result;
}

test("current_setting request.jwt.claim 예외는 문자열 제거 전에 판정한다", () => {
  const result = runSecurityCheck(`
    CREATE OR REPLACE FUNCTION public.cron_only_task()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      IF coalesce(current_setting('request.jwt.claim.role', true), '') not in ('', 'service_role') THEN
        RAISE EXCEPTION 'forbidden';
      END IF;
    END;
    $$;
  `);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /SECURITY DEFINER 검사 통과/);
});

test("auth.uid 또는 current_setting 예외가 없으면 위반으로 보고한다", () => {
  const result = runSecurityCheck(`
    CREATE OR REPLACE FUNCTION public.insecure_task()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      PERFORM 1;
    END;
    $$;
  `);

  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /auth\.uid\(\) 검증 누락/);
});
