# ADR 014: Serialize chronological program transitions

Status: accepted

## Decision

Serialize transition persistence by locking the monitored program row in PostgreSQL. Every transition supplies the snapshot ID it was built from. Persistence accepts the candidate only when that snapshot remains latest, treats the latest fingerprint as the only duplicate state, and rejects stale writers for reconciliation retry.

Allow the same fingerprint to appear in multiple snapshots when an intervening state exists.

## Rationale

A global `(program_id, fingerprint)` uniqueness constraint confuses state identity with version history. Upgrade-authority changes can move from A to B and back to A without changing the deployment slot. The final A state is a real transition and must not resolve to the original snapshot.

Multiple workers can also read the same previous snapshot and observe different later states. Without serialization, both can create branches from one prior version and break chronological evidence.

## Consequences

- Polling the unchanged latest state remains idempotent.
- Concurrent duplicate observations are no-ops after acquiring the program lock.
- A stale candidate is not stored and reconciliation retries from the new latest snapshot.
- Historical fingerprint lookup uses a non-unique index.
- Snapshot ordering remains based on finalized observed slot, then creation order.
