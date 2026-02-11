# ADR 0001: Read = View, Write = RPC

Status: Accepted  
Date: 2026-02-02

## Context

The project had growing read RPC usage for data shapes that can be expressed with DB views and client query builder calls. This increased duplication and API surface complexity.

At the same time, write paths (order create, cart replace) require transactional integrity and ownership checks that are not suitable for pure client-side table writes.

## Decision

Adopt the following architecture rule:

- **Read path**: DB View + `from().select()` in API layer.
- **Write path**: Edge Function entrypoint + write RPC for transactional persistence.

Additional constraints:

1. UI and DTO remain separated (Option B).
2. Mapping lives in API mapper files only.
3. Read RPCs are disallowed when a view + query builder can satisfy the shape.
4. Write RPCs must declare explicit security mode and ownership checks.

## Consequences

Positive:

- Smaller RPC surface area for read use cases.
- Better discoverability of read models via views.
- Cleaner feature API layer and mapper boundaries.

Trade-offs:

- Two patterns coexist by design (View for read, RPC for write).
- Requires discipline in code review to prevent direct write RPC use from client.

## Applied Changes

- Product read migrated to `product_list_view`.
- Order read migrated to `order_list_view` + `order_item_view`.
- `get_products`, `get_product_by_id`, `get_products_by_ids` read RPC usage removed from client.
- `get_orders`, `get_order` read RPC usage removed from client.

## Non-Goals

- Immediate rewrite of write RPC internals.
- Immediate grant model overhaul for existing write RPCs.

## Follow-up

1. Tighten write RPC execution boundary (if strict Edge-only contract is required).
2. Move money finalization fully into RPC and/or verify totals in RPC.
3. Remove legacy read objects no longer referenced (`get_orders`, `get_order`, legacy `order_items_view`).
