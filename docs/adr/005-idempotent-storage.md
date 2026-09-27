# ADR 005: At-least-once work with exactly-once effects

Status: accepted

## Decision

Allow duplicate reconciliation work, serialize each program with a PostgreSQL row lock, and enforce event uniqueness on `(previous_snapshot_id, current_snapshot_id, type)` inside one database transaction.

## Rationale

Distributed exactly-once message delivery is unnecessary for Milestone 1. PostgreSQL transactions and constraints are durable across process restarts and make replay safe. Snapshot fingerprints are not globally unique because a program may return to a previously observed authority or metadata state after an intervening transition.

## Consequences

Workers treat the latest matching fingerprint as a successful no-op and retry candidates built from stale previous snapshots. PostgreSQL is the system of record; an in-memory queue may optimize work but cannot define correctness. See ADR 014 for chronological ordering.
