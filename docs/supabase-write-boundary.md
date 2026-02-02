# Supabase Write Boundary

Last updated: 2026-02-02

## Goal

Define a clear write boundary for orders and cart:

- Client must not call write RPC directly.
- Client calls Edge Function for write use cases.
- Edge validates input and business preconditions.
- RPC executes transactional DB writes.

## Current Write Path

## Order Create

1. Client calls `create-order` Edge Function from `src/features/order/api/order-api.ts`.
2. Edge authenticates user from `Authorization` header.
3. Edge loads products/options/coupons and computes:
   - `unit_price`
   - `discount_amount`
   - `originalPrice`
   - `totalDiscount`
   - `totalPrice`
4. Edge calls `public.create_order_txn(...)`.
5. RPC writes `orders`, `order_items`, updates `user_coupons` status.

## Cart Replace

1. Client calls `public.replace_cart_items(p_user_id, p_items)`.
2. RPC checks `p_user_id = auth.uid()` and replaces cart rows in one transaction.

## Responsibility Split

- Edge Function (`supabase/functions/create-order/index.ts`)
  - Request schema checks
  - Auth check
  - Product/option/coupon availability checks
  - Price/discount derivation
- Write RPC (`create_order_txn`, `replace_cart_items`)
  - Atomic writes and integrity
  - Ownership checks (`auth.uid()`)
  - Final persistence

## Security Notes

- `create-order` Edge is deployed with `verify_jwt = true`.
- `create_order_txn` and `replace_cart_items` are `SECURITY DEFINER`.
- Both write RPCs are executable by `authenticated` in current DB grants.

## Mandatory Rules (Team)

1. New write flows must follow: `Client -> Edge -> RPC`.
2. No direct client call to new write RPC in feature code.
3. Write RPC must explicitly declare security mode (`DEFINER` or `INVOKER`).
4. Personalized write RPC must enforce `auth.uid()` ownership checks.
5. Money-related values are computed server-side only.

## Checklist For New Write Flow

- [ ] Edge endpoint exists and is the single client entrypoint.
- [ ] `verify_jwt` is enabled.
- [ ] Edge validates payload and preconditions.
- [ ] RPC performs transactional write.
- [ ] RPC checks ownership (`auth.uid()`).
- [ ] Migration includes explicit grants/revokes.
- [ ] Tests cover unauthorized, invalid payload, and happy path.
