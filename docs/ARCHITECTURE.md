# UseKratose core architecture

UseKratose treats finalized Solana account state as the source of truth. The core product is the continuous path from a program address to durable, deterministic security evidence.

## Core pipeline

1. Ingestion validates a Solana address and resolves its loader-v3 ProgramData account.
2. Finalized HTTP reads recover executable bytes, deployment slot, owner, executable state, and upgrade authority.
   Mainnet reads use a cluster-aware provider chain with Solami first and a separately configured fallback.
3. Canonical hashing creates a version snapshot without including observation time.
4. WebSocket account notifications schedule reconciliation but never provide authoritative evidence.
5. Periodic finalized polling provides completeness when notifications are delayed or lost.
6. The diff engine compares the latest stored version with the finalized candidate.
7. PostgreSQL serializes each program transition, persists the snapshot, and stores typed security events in one transaction.

## Module boundaries

- `packages/core` contains pure parsing, hashing, diffing, event rules, and report formatting.
- `packages/application` orchestrates ingestion and reconciliation through typed ports.
- `packages/solana` implements finalized RPC, Program Metadata retrieval, and WebSocket signaling.
- `packages/database` implements ordered, idempotent persistence in PostgreSQL/Supabase.
- `apps/monitor` runs the persistent reconciliation worker.
- `apps/web` owns the public domain, request-scoped APIs, and marketing surface; it is not part of detection correctness.
- `apps/dashboard` is an independently deployable authenticated console served through the public `/dashboard` route.

## Runtime boundary

The two Next.js applications may run as separate Vercel projects behind one public origin. Continuous WebSocket monitoring and reconciliation require a persistent worker and must not run as a Vercel request handler. Supabase Postgres is the shared system of record.

## Correctness rules

- Only finalized HTTP reads produce snapshots.
- WebSockets are hints; polling is mandatory.
- One program's transitions are serialized with a PostgreSQL row lock.
- A transition is accepted only when its expected previous snapshot is still latest.
- Repeated fingerprints after an intervening state are valid new versions.
- Duplicate observations of the latest fingerprint are no-ops.
- Event severity is determined only by documented rules.
- Optional IDL, source, alert, API, UI, and AI layers cannot alter core evidence.

See [Core Release Gate](core-release-gate.md) and [Architectural Decisions](decisions.md).
