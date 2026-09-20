# ADR 012: Supabase Postgres system of record

- Date: 2026-09-20
- Status: Accepted

## Context

Vercel functions, a persistent monitor, transactional event creation, deduplication, and delivery claiming need one shared durable store.

## Decision

Use Supabase PostgreSQL. Vercel connects through transaction pooling with one application connection and prepared statements disabled. The worker uses a direct or session-pooled connection. Product tables enable RLS and revoke browser roles; public Supabase credentials never grant product-table writes.

## Alternatives

- Browser Data API writes make worker transactions and multi-row idempotency harder.
- Separate databases for web and monitoring create synchronization and trust problems.

## Tradeoffs

Migrations require the server-only connection URL. The public URL and publishable key alone are intentionally insufficient for monitor or API writes.
