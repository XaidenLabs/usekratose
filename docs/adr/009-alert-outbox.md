# ADR 009: Persistent signed alert outbox

- Date: 2026-09-20
- Status: Accepted

## Context

Network delivery is unreliable and monitor reconciliation is intentionally at-least-once.

## Decision

Create one database delivery per security-event/destination pair. Workers claim due rows with `FOR UPDATE SKIP LOCKED`, sign canonical payload bytes with HMAC-SHA256, and retry with bounded backoff. Secrets are AES-256-GCM encrypted at rest.

## Alternatives

- Direct webhook calls during reconciliation could lose alerts on process failure.
- An external queue adds infrastructure that is unnecessary for the MVP.

## Tradeoffs

PostgreSQL is both system of record and queue. This is operationally simple but should be revisited at high delivery volume.
