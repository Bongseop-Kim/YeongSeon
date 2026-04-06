#!/usr/bin/env node
/**
 * SECURITY DEFINER 함수에 auth.uid() 소유권 검증이 있는지 확인한다.
 *
 * 면제 조건 (넷 중 하나면 통과):
 *   1. 함수 본문에 auth.uid() 호출이 있음
 *   2. 함수 본문에 is_admin() 호출이 있음 (관리자 전용 함수)
 *   3. 함수 본문에 current_setting('request.jwt.claim...) 호출이 있음 (스케줄러/pg_cron 전용)
 *   4. CREATE FUNCTION 앞뒤 600자 이내에 "-- ... SECURITY DEFINER ..." 주석이 있음
 *      (사유:, 유지 사유:, 사용 근거:, bypasses RLS 등 다양한 형식 허용)
 *
 * 전체 검사:  node scripts/check-sql-security.mjs              (schemas/ 대상)
 * 특정 파일:  node scripts/check-sql-security.mjs a.sql b.sql  (lint-staged 연동)
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, relative, basename } from "path";
import { fileURLToPath } from "url";

/**
 * SQL 텍스트에서 라인 주석(-- ...), 블록 주석(/* ... *\/), 문자열 리터럴('...', $$...$$)을
 * 제거하여 실행 코드 영역만 반환한다.
 * 면제 조건 regex가 주석/문자열 내 패턴에 잘못 매칭되는 것을 방지한다.
 */
function stripSqlNonCode(sql) {
  let result = "";
  let i = 0;
  while (i < sql.length) {
    // 라인 주석: -- ... \n
    if (sql[i] === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      continue;
    }
    // 블록 주석: /* ... */
    if (sql[i] === "/" && sql[i + 1] === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    // 단일 따옴표 문자열: '...' ('' 이스케이프 포함)
    if (sql[i] === "'") {
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    // 달러 인용 문자열: $$...$$ 또는 $tag$...$tag$
    const dollarMatch = sql.slice(i).match(/^\$([^$]*)\$/);
    if (dollarMatch) {
      const tag = dollarMatch[0];
      i += tag.length;
      const endIdx = sql.indexOf(tag, i);
      i = endIdx !== -1 ? endIdx + tag.length : sql.length;
      continue;
    }
    result += sql[i++];
  }
  return result;
}

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");

// 전체 검사 시 schemas만 검사 (마이그레이션은 squash 후 schemas가 기준)
const FULL_SCAN_DIRS = ["supabase/schemas"];

// squash 마이그레이션은 이전 버전 함수 스냅샷이므로 제외
const isSquashFile = (f) => basename(f).includes("_squash.");

function walkSql(dir) {
  const results = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) results.push(...walkSql(full));
      else if (entry.endsWith(".sql")) results.push(full);
    }
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    // 디렉토리 없으면 skip
  }
  return results;
}

const targetFiles =
  process.argv.length > 2
    ? process.argv.slice(2).filter((f) => f.endsWith(".sql"))
    : FULL_SCAN_DIRS.flatMap((d) => walkSql(join(ROOT, d)));

const sqlFiles = targetFiles.filter((f) => {
  const normalized = f.replace(/\\/g, "/");
  return !normalized.includes("supabase/tests") && !isSquashFile(f);
});

if (sqlFiles.length === 0) {
  process.stdout.write("✅ 검사 대상 SQL 파일 없음\n");
  process.exit(0);
}

const violations = [];

for (const file of sqlFiles) {
  let content;
  try {
    content = readFileSync(file, "utf-8");
  } catch (err) {
    process.stderr.write(
      `⚠️  파일 읽기 실패 (건너뜀): ${file}: ${err.message}\n`,
    );
    continue;
  }

  // CREATE [OR REPLACE] FUNCTION 경계로 분리 → 함수 단위로 검사
  const parts = content.split(/(?=\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b)/i);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // SECURITY DEFINER 없거나 CREATE FUNCTION 없는 청크(주석 등)는 skip
    if (!/\bSECURITY\s+DEFINER\b/i.test(part)) continue;
    if (!/\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b/i.test(part)) continue;

    const nameMatch = part.match(
      /\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([^\s(]+)/i,
    );
    const funcName = nameMatch ? nameMatch[1] : "(unknown)";

    // 면제 1-3: 주석·문자열 제거 후 실행 코드 영역에서만 검사
    const execCode = stripSqlNonCode(part);

    // 면제 1: auth.uid() 호출 있음
    if (/\bauth\.uid\(\)/i.test(execCode)) continue;

    // 면제 2: is_admin() 호출 있음 (관리자 전용)
    if (/\bis_admin\(\)/i.test(execCode)) continue;

    // 면제 3: JWT role 기반 스케줄러 함수 (pg_cron 등 서버 내부 호출)
    if (/current_setting\s*\(\s*['"]request\.jwt\.claim/i.test(execCode))
      continue;

    // 면제 4: CREATE FUNCTION 앞뒤 600자 이내에 SECURITY DEFINER 주석이 있음
    // 패턴 예: "-- SECURITY DEFINER 사유:", "-- SECURITY DEFINER 유지 사유:",
    //          "-- SECURITY DEFINER 사용 근거:", "-- ... SECURITY DEFINER bypasses RLS"
    // 함수 본문 전체가 아닌 CREATE FUNCTION 선언부 근처만 검사한다.
    const prevTail = i > 0 ? parts[i - 1].slice(-600) : "";
    const cfIdx = part.search(/\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b/i);
    const windowAfter =
      cfIdx >= 0 ? part.slice(0, cfIdx + 600) : part.slice(0, 600);
    const context = prevTail + windowAfter;
    if (/--[^\n]*\bSECURITY\s+DEFINER\b/i.test(context)) continue;

    violations.push(`  ${relative(ROOT, file)}: ${funcName}`);
  }
}

if (violations.length > 0) {
  process.stderr.write(
    "\n❌ SECURITY DEFINER 함수에 auth.uid() 검증 누락:\n\n",
  );
  for (const v of violations) process.stderr.write(v + "\n");
  process.stderr.write(`
해결 방법:
  1. 함수 내부에 auth.uid() 소유권 검증 추가 (권장)
  2. 관리자 전용이면 is_admin() 검증 추가
  3. 트리거/유틸리티 등 의도적인 경우, CREATE FUNCTION 바로 위에 사유 주석 추가:
     -- SECURITY DEFINER 사유: <이유>
`);
  process.exit(1);
}

process.stdout.write(
  `✅ SECURITY DEFINER 검사 통과 (${sqlFiles.length}개 파일)\n`,
);
