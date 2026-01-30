# AGENTS.md

## Goal

Standardize the codebase on **Option B: UI/DTO separation**.

## Supabase Workflow Strategy

- **Source of truth is Git**: all DB/RPC/Edge Function changes must be in repo.
- **No dashboard edits**: if a dashboard change happens, immediately backport with `supabase db pull` and commit the migration.
- **Local-first development**:
  - Run `supabase start` for local stack.
  - Create migrations via `supabase migration new` (or `supabase db diff` after manual edits).
  - Validate with `supabase db reset` before PR.
- **Deploy via CLI only**:
  - DB: `supabase db push`
  - Functions: `supabase functions deploy`
- **Edge Functions location**: `supabase/functions/*` (shared code in `_shared`).
  - Local dev: `supabase functions serve`
  - Function config via `supabase/config.toml` (e.g., `verify_jwt`).
- **Edge Functions workflow**:
  - Manage in `supabase/functions/*` only (no dashboard edits).
  - Local test (`deno check` / `supabase functions serve`) before deploy.
  - Deploy via CLI: `supabase functions deploy <name>`.
- **Secrets management**: use `supabase secrets set`, never commit secrets.
- **Environment policy**:
  - Minimum `dev` and `prod` separation.
  - If preview branches are used, treat them as read-only outputs of PRs.
- **Migration squash/rebase safety**:
  - **Never squash migrations already applied to production.**
  - **Squash only before first prod deploy** or during a planned “schema reset” milestone.
  - **Safe squash (pre‑prod only)**:
    - Ensure all teammates are synced; no pending local migrations.
    - Replace multiple migrations with a single baseline migration.
    - Run `supabase db reset` locally and verify schema matches.
    - For remote dev/preview DBs, **reset/recreate** instead of pushing conflicting history.
  - **Rebase**:
    - Rebase feature branches on `main` when behind.
    - If migration conflicts appear, regenerate/reapply as needed.
    - After rebase, run `supabase db reset` to validate.

## Core Principle

- **UI types are display/domain models.**
- **DTOs are API/RPC inputs/outputs.**
- Mapping between UI and DTO happens in a single, explicit layer.

## Domain Strategy

- **Product**
  - RPC output: `ProductDTO`
  - UI display: `ProductView`
  - Map once in the API layer
- **Cart**
  - Storage: normalized DTO (`product_id`, `option_id`, `quantity`, `coupon_id`, `reform_data`)
  - RPC output: `CartItemView` (assembled for UI)
  - UI-only state split out (e.g. `CartItemUIState` for `isSelected`)
- **Order**
  - Write DTOs: normalized id-based inputs
  - Read DTOs: `OrderView` (assembled for UI)

## RPC/Backend Rules

1. **RPC returns View DTOs only.**
   - All read endpoints return `*View` types.
2. **Write RPCs compute money server-side.**
   - Never trust client totals/prices; derive from DB.
3. **Auth enforced in every personalized RPC.**
   - Must use `auth.uid()` checks.
4. **Business rules live in service layer.**
   - Avoid policy decisions (if/else business logic) inside RPC/SQL.
5. **SQL limited to data access/formatting.**
   - SQL handles retrieval, filtering, and formatting only.
   - Meaning/decision logic belongs in the service layer.
6. **RPC security mode must be explicit.**
   - Always specify SECURITY DEFINER or SECURITY INVOKER and review RLS impact.
7. **Prefer DB Views for simple joins/formatting.**
   - Use Views to return `*ViewDTO` directly and reduce service-layer mapping.

## Facade Rule

- Introduce a facade/service **when multiple features depend on the same API surface**.
- If an API is only used within a single feature, keep it local (no facade).

## Frontend Rules

1. **Type layering**
   - `types/view/*` for UI rendering
   - `types/dto/*` for RPC inputs/outputs
   - `types/db/*` for raw DB models (including generated types)
2. **Mapping location**
   - Mapping lives in API layer only (one hop)
   - Keep `api/*-api.ts` thin; put mappers in `api/*-mapper.ts`
   - No mapper inside UI domain
3. **No shared shapes**
   - UI types are never used as RPC inputs
   - RPC outputs are never consumed directly by UI without mapping
4. **Common calculations**
   - Keep shared pricing/discount logic in one place
5. **Discriminated unions**
   - Prefer `type`-based narrowing over `as` casts in mappers
6. **Avoid non-null assertions**
   - Do not use `!` unless guarded by explicit runtime checks
5. **Import Conventions (Strict)**
   - Always use absolute paths with the @/ alias (e.g., import { ... } from '@/types/dto/order').
   - No relative paths (e.g., ../../types) allowed for cross-directory imports.

## Shared Mapper Rules

- Common mapping helpers (product/coupon/tie) should live in `api/shared/` or `mappers/`
- Prefer reuse over duplicating mapping logic across features

## DTO Naming

- Write DTOs: `*Input`, `*CreateInput`, `*UpdateInput`
- Read DTOs: `*View`, `*Output`, `*DTO`
- Mappers: `to*Input`, `to*View`, `from*DTO`

## Enforcement

- New RPCs must not accept/return UI types directly.
- Avoid mixed shapes (e.g. no `product` + `product_id` in a single type).
- Prefer per-feature `dto/` and `view/` folders.
