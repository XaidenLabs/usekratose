# Core release gate

Feature development remains paused until the continuous deployment-security pipeline satisfies this gate.

## In scope

- loader-v3 program ingestion and ProgramData resolution;
- executable and account-data fingerprints;
- deployment slot, owner, executable state, and upgrade authority extraction;
- finalized WebSocket signaling plus polling reconciliation;
- chronological version snapshots;
- deterministic diff rules and persisted security events;
- duplicate suppression, concurrent-writer ordering, and restart-safe persistence.

Frontend features, AI explanations, billing, and additional intelligence are not release blockers for the core.

## Automated requirements

- Strict TypeScript compilation passes for core, application, Solana, database, and monitor packages.
- Loader parsing rejects malformed variants, owners, account lengths, and authority options.
- RPC parsing rejects malformed payloads, unsafe numeric values, and invalid base64.
- WebSocket tests prove finalized subscriptions, unsubscribe behavior, and rejected-subscription degradation.
- Reconciliation tests prove no-change behavior, executable upgrades, authority changes, immutability, owner changes, simultaneous owner/executable changes, and return to a previously observed state.
- PostgreSQL tests prove structured snapshot/event round trips, duplicate suppression, stale-writer rejection, repeated-state persistence, and atomic event storage.
- Production builds pass.

## Live requirements

- A real devnet v1 to v2 upgrade produces a later deployment slot, changed executable hash, and one high-severity `PROGRAM_UPGRADED` transition.
- A read-only reconciliation of the current deployment matches the latest stored ProgramData address, deployment slot, executable hash, authority, and fingerprint.
- A separate upgrade performed while WebSocket delivery is unavailable is recovered by polling and persisted exactly once.

## Current evidence

- Real upgrade evidence exists in `docs/evidence/devnet-upgrade-2026-09-18.json`.
- Program `EfJhXeDqu4YS6fZRj9Z1vCpzJwhJsjZ7qRdyFdSMmJHT` currently matches its stored fingerprint, executable hash, deployment slot `502141696`, ProgramData address, and authority.
- The Supabase-backed acceptance suite passes ordered transition, stale-writer, repeated-state, JSON persistence, and deduplication checks.

## Remaining gate

The WebSocket-disabled live recovery transaction is still unperformed. It requires a separately reviewed devnet upgrade transaction and explicit user approval. Until that proof is captured, the core is validated but not declared production-ready.

Run the observer without WebSockets using:

```bash
pnpm proof:polling-recovery -- PROGRAM_ID
```
