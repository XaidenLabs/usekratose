# ADR 015: Live product data only

## Status

Accepted.

## Decision

Every UI value that represents platform state must come from an authoritative
runtime source:

- Solana deployment facts come from stored finalized snapshots.
- Security activity comes from persisted deterministic events.
- Project identity, API keys, destinations, and metrics come from Postgres.
- User identity comes from a server-validated Supabase session.
- Cluster defaults and RPC endpoints come from environment configuration.

When an authoritative value is unavailable, the UI renders an explicit empty,
unavailable, or pending state. It must not substitute a fabricated program,
hash, slot, authority, event, timestamp, key, destination, metric, or health
status.

Static product copy, field labels, supported enum values, and documented API
route contracts are not runtime state and remain source-controlled.

## Consequences

Public landing and authentication pages query the most recent persisted public
security activity. Authenticated settings pages resolve the current user's
project before listing configuration. Monitoring routes do not fall back to a
public RPC URL when environment configuration is missing; they fail explicitly.
