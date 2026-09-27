# ADR 016: Standalone dashboard behind an authenticated API boundary

## Status

Accepted.

## Context

UseKratose needs a public marketing application and an authenticated product
console that can evolve and deploy independently inside an organization. The
console must not import database adapters or Solana monitoring internals because
that would couple its release cycle and runtime privileges to the backend.

## Decision

- `apps/web` owns the marketing site and server-side product API.
- `apps/dashboard` owns the authenticated console and is deployed as a separate
  Vercel project.
- Both applications use the same Supabase Auth project so browser sessions work
  across their configured domains.
- The dashboard reads and mutates product data only through authenticated HTTP
  endpoints in `apps/web`. It forwards the current Supabase access token as a
  bearer token; the backend verifies that token before resolving the user's
  project.
- The persistent monitor worker remains outside both Vercel applications and
  writes snapshots and events to the shared Supabase Postgres database.
- No fixture data is used in product pages. Empty states are rendered when the
  API returns no records.

## Consequences

The dashboard can be deployed, scaled, and redesigned independently without
gaining direct database credentials. The API contract becomes an explicit
boundary that can later serve external clients. Deployments must configure
cross-application URLs and use compatible Supabase cookie domains in production.

