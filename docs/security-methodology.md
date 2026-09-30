# Security methodology

## What UseKratose verifies

UseKratose continuously records finalized Solana loader-v3 state and creates deterministic evidence when that state changes. Every snapshot includes the program identity, ProgramData account, deployment slot, executable hash, account-data hash, executable flag, owner, upgrade authority, and any available IDL or source-verification evidence.

WebSocket notifications only trigger reconciliation. Finalized HTTP RPC reads are the authority for persisted evidence, and periodic polling recovers missed notifications.

## Deterministic event model

The rule engine compares consecutive finalized snapshots and emits typed events for executable changes, authority changes, immutability, owner changes, executable-state changes, IDL changes, and source-verification changes. Severity comes from versioned rules rather than an AI-generated risk score.

Optional AI explanations receive structured evidence after an event exists. They cannot change hashes, severity, verification status, or persisted facts.

## Evidence boundaries

UseKratose can establish that observed deployment state changed and show the exact fields that differ. It cannot prove that:

- a program contains no software vulnerabilities;
- an RPC provider never withheld an observation;
- unavailable source code corresponds to deployed bytecode;
- a repository is trustworthy merely because it is linked;
- an upgrade was authorized by the intended human or governance process.

Missing IDL, source, or metadata evidence is displayed as unavailable and never treated as successful verification.

## Integrity and delivery

- Snapshot fingerprints use canonical SHA-256 inputs.
- Database constraints and transactional reconciliation prevent duplicate latest-state events.
- API keys are stored as keyed hashes and are project-scoped, revocable, and rate-limited.
- Webhook secrets are encrypted at rest and deliveries use timestamped HMAC signatures.
- Private and loopback webhook destinations are rejected; production egress controls remain necessary to mitigate DNS rebinding.

## Supported scope

The current deterministic loader parser supports Solana upgradeable loader-v3 programs. Other loaders and chains require separate parsers and must not be represented as verified by this implementation.

## Validation evidence

Automated release requirements are listed in [`core-release-gate.md`](core-release-gate.md). A real devnet upgrade fixture is retained in [`evidence/devnet-upgrade-2026-09-18.json`](evidence/devnet-upgrade-2026-09-18.json). The remaining live polling-recovery requirement must be completed before claiming full production readiness.
