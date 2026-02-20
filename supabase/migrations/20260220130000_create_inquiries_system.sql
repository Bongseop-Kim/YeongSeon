-- =============================================================
-- Migration: create_inquiries_system
-- Description: 1:1 문의 CRUD backend —
--   table, indexes, constraints, RLS (full CRUD), trigger, grants
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. inquiries table
-- ─────────────────────────────────────────────────────────────

create table "public"."inquiries" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "title" text not null,
  "content" text not null,
  "status" text not null default '답변대기',
  "answer" text,
  "answer_date" timestamptz,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

alter table "public"."inquiries" enable row level security;

-- ─────────────────────────────────────────────────────────────
-- 2. Constraints
-- ─────────────────────────────────────────────────────────────

alter table "public"."inquiries"
  add constraint "inquiries_pkey" primary key ("id");

alter table "public"."inquiries"
  add constraint "inquiries_status_check"
  check ("status" in ('답변대기', '답변완료'));

alter table "public"."inquiries"
  add constraint "inquiries_title_check"
  check (char_length("title") > 0);

alter table "public"."inquiries"
  add constraint "inquiries_content_check"
  check (char_length("content") > 0);

-- FK constraints
alter table "public"."inquiries"
  add constraint "inquiries_user_id_fkey"
  foreign key ("user_id") references "auth"."users"("id") on delete cascade;

-- ─────────────────────────────────────────────────────────────
-- 3. Indexes
-- ─────────────────────────────────────────────────────────────

create index "idx_inquiries_user_id" on "public"."inquiries" ("user_id");
create index "idx_inquiries_status" on "public"."inquiries" ("status");

-- ─────────────────────────────────────────────────────────────
-- 4. RLS Policies
--
-- 사용자는 본인 문의만 CRUD 가능.
-- UPDATE는 답변대기 상태에서만 허용 (답변완료 후 수정 불가).
-- DELETE는 답변대기 상태에서만 허용.
-- 관리자 답변은 service_role 또는 향후 admin RPC로 처리.
--
-- 테스트 시나리오:
--   1. 인증 사용자 A: INSERT → 성공
--   2. 인증 사용자 A: SELECT own → 성공
--   3. 인증 사용자 B: SELECT A's inquiry → 0 rows (차단)
--   4. 인증 사용자 A: UPDATE own (답변대기) → 성공
--   5. 인증 사용자 A: UPDATE own (답변완료) → 실패 (차단)
--   6. 인증 사용자 B: UPDATE A's inquiry → 실패 (차단)
--   7. 인증 사용자 A: DELETE own (답변대기) → 성공
--   8. 인증 사용자 A: DELETE own (답변완료) → 실패 (차단)
--   9. 인증 사용자 B: DELETE A's inquiry → 실패 (차단)
--  10. 비인증 사용자: 모든 작업 → 실패 (차단)
-- ─────────────────────────────────────────────────────────────

-- SELECT: 본인 문의만 조회
create policy "Users can view their own inquiries"
on "public"."inquiries"
as permissive
for select
to public
using ((auth.uid() = user_id));

-- INSERT: 본인 문의만 생성
create policy "Users can create their own inquiries"
on "public"."inquiries"
as permissive
for insert
to public
with check ((auth.uid() = user_id));

-- UPDATE: 본인 문의 + 답변대기 상태에서만 수정
create policy "Users can update their own pending inquiries"
on "public"."inquiries"
as permissive
for update
to public
using ((auth.uid() = user_id) and (status = '답변대기'))
with check ((auth.uid() = user_id));

-- DELETE: 본인 문의 + 답변대기 상태에서만 삭제
create policy "Users can delete their own pending inquiries"
on "public"."inquiries"
as permissive
for delete
to public
using ((auth.uid() = user_id) and (status = '답변대기'));

-- ─────────────────────────────────────────────────────────────
-- 5. Trigger (reuse existing update_updated_at_column)
-- ─────────────────────────────────────────────────────────────

create trigger update_inquiries_updated_at
  before update on public.inquiries
  for each row
  execute function public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- 6. Grants (matches existing table pattern)
-- ─────────────────────────────────────────────────────────────

grant delete on table "public"."inquiries" to "anon";
grant insert on table "public"."inquiries" to "anon";
grant references on table "public"."inquiries" to "anon";
grant select on table "public"."inquiries" to "anon";
grant trigger on table "public"."inquiries" to "anon";
grant truncate on table "public"."inquiries" to "anon";
grant update on table "public"."inquiries" to "anon";

grant delete on table "public"."inquiries" to "authenticated";
grant insert on table "public"."inquiries" to "authenticated";
grant references on table "public"."inquiries" to "authenticated";
grant select on table "public"."inquiries" to "authenticated";
grant trigger on table "public"."inquiries" to "authenticated";
grant truncate on table "public"."inquiries" to "authenticated";
grant update on table "public"."inquiries" to "authenticated";

grant delete on table "public"."inquiries" to "service_role";
grant insert on table "public"."inquiries" to "service_role";
grant references on table "public"."inquiries" to "service_role";
grant select on table "public"."inquiries" to "service_role";
grant trigger on table "public"."inquiries" to "service_role";
grant truncate on table "public"."inquiries" to "service_role";
grant update on table "public"."inquiries" to "service_role";
