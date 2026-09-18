# ADR 005: At-least-once work with exactly-once effects

Status: accepted

## Decision

Allow duplicate reconciliation work and enforce uniqueness on `(program_id, fingerprint)` for snapshots and `(from_snapshot_id, to_snapshot_id)` for events inside one database transaction.

## Rationale

Distributed exactly-once message delivery is unnecessary for Milestone 1. PostgreSQL constraints are durable across process restarts and races and make replay safe.

## Consequences

Workers must treat uniqueness conflicts as successful no-ops. PostgreSQL is the system of record; an in-memory queue may optimize work but cannot define correctness.
