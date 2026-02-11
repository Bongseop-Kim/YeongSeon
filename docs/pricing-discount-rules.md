# Pricing & Discount Rules

Last updated: 2026-02-11

## Scope

- Order write RPC pricing/discount computation in `create_order_txn`.
- Coupon application rules for per-item discount and line totals.

## Core Invariants

1. Money is computed server-side in RPC only.
2. Unit discount must satisfy `0 <= unit_discount <= unit_price`.
3. Line discount must satisfy `line_discount = unit_discount * quantity`.
4. Order total discount must equal the sum of all line discounts.

## Coupon Cap Rule (Order Domain)

When a coupon is applied to a line item:

1. Compute initial per-unit discount from coupon type:
   - `percentage`: `floor(unit_price * (discount_value / 100))`
   - `fixed`: `floor(discount_value)`
2. Clamp per-unit discount by unit price:
   - `unit_discount = greatest(0, least(unit_discount, unit_price))`
3. If `max_discount_amount` exists, apply cap per unit first:
   - `per_unit_cap = floor(max_discount_amount / quantity)`
   - `unit_discount = least(unit_discount, per_unit_cap)`
4. Recompute line discount from the capped unit discount:
   - `line_discount = unit_discount * quantity`

## Why Per-Unit Cap First

- Prevents mismatch between:
  - `total_discount` aggregation, and
  - the sum of persisted per-line discount amounts.
- Avoids post-hoc reverse calculation (`line -> unit`) that can cause rounding drift.

## Implementation References

- `supabase/migrations/20260202180000_cap_coupon_discount_per_line_total.sql`
- `supabase/migrations/20260202182000_add_order_item_line_discount_amount.sql`
