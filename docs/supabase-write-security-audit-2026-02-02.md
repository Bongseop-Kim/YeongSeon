# Supabase Write Security Audit (2026-02-02)

## Scope

- Write RPCs: `create_order_txn`, `replace_cart_items`
- Related read/write RPC: `get_cart_items`
- Related tables/policies: `orders`, `order_items`, `cart_items`, `user_coupons`, `shipping_addresses`
- Edge Function: `create-order`

## Snapshot

- `create-order` Edge: `verify_jwt = true` (deployed)
- `create_order_txn`: `SECURITY DEFINER`, executable by `authenticated`
- `replace_cart_items`: `SECURITY DEFINER`, executable by `authenticated`
- `get_cart_items`: `SECURITY INVOKER`, executable by `authenticated`

## RLS/Policy Check

Confirmed policies enforce user ownership on:

- `orders`: insert/select with `auth.uid() = user_id`
- `order_items`: select/insert through owning `orders` row
- `cart_items`: select/insert/update/delete for own `user_id`
- `shipping_addresses`: select/insert/update/delete with own `user_id`
- `user_coupons`: own select + service role all

## Findings

## F-01 (Medium): write RPCs executable by `authenticated`

`create_order_txn` and `replace_cart_items` can be called directly by authenticated clients.

Risk:

- Bypasses intended Edge-only boundary.
- Allows alternate clients to hit write RPC contract directly.

Current mitigation:

- `replace_cart_items` has `p_user_id` ownership check.
- `create_order_txn` validates auth + shipping ownership + item type.

Recommendation:

- Keep as-is for now if backward compatibility is required.
- If strict boundary is needed, move to service-role-mediated write path or add RPC-level anti-abuse constraints and tighter grants.

## F-02 (Medium): money values still accepted as RPC params

`create_order_txn` accepts `p_original_price`, `p_total_discount`, `p_total_price`.

Risk:

- Violates the strict interpretation of "write RPC computes money server-side".
- Trust boundary depends on Edge correctness.

Current mitigation:

- Edge recomputes prices from DB state before RPC call.

Recommendation:

- Next milestone: make RPC compute totals from normalized line inputs and DB prices, or assert passed totals against DB-derived values inside RPC.

## F-03 (Low): legacy `order_items_view` linter issue

Advisor reports `security_definer_view` on `public.order_items_view`.

Risk:

- Potential confusion/misuse if legacy view is used.

Recommendation:

- Deprecate and eventually remove or replace with invoker-safe view strategy (`order_item_view`).

## Decision

- No immediate grant/policy migration in this phase.
- Boundary and rules are documented and locked by ADR.
- Security hardening tasks remain as follow-up backlog items.
