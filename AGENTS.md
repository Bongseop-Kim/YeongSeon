# AGENTS.md

## Goal

Standardize the codebase on **Option B: UI/DTO separation**.

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
