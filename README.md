# UseKratose

UseKratose is continuous security verification for Solana programs. It detects loader-v3 deployment changes, explains deterministic IDL/source deltas, delivers signed alerts, exposes project-scoped APIs, and presents the same evidence through a Vercel-hosted dashboard and public profiles.

## Repository layout

```text
apps/
  web/          Next.js backend route handlers deployed to Vercel
  monitor/      Persistent WebSocket and reconciliation worker
packages/
  core/         Pure loader parsing, fingerprints, snapshots, and diff rules
  application/  Ingestion and reconciliation use cases with dependency ports
  solana/       Validated HTTP RPC and WebSocket adapters
  database/     PostgreSQL adapter and migrations
  alerts/       Signed webhook outbox and retry engine
  explanations/ Optional evidence-guided AI explanations
programs/
  demo-upgradeable/  Reproducible v1/v2 Solana upgrade proof program
docs/
  adr/          Architectural decision records
```

The `programs/` directory owns on-chain programs. The Next.js application owns future frontend code and current backend route handlers. Shared domain behavior does not live inside Next.js, so workers and future services can reuse it without importing framework code.

## Quick start

Requirements: Node.js 22+, pnpm 10+, and Supabase PostgreSQL or local PostgreSQL 15+.

```bash
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm test
pnpm typecheck
pnpm dev
```

Run the long-lived monitor separately:

```bash
pnpm dev:monitor
```

Ingest a devnet program:

```bash
curl -X POST http://localhost:3000/api/v1/organizations/demo/programs \
  -H 'content-type: application/json' \
  -d '{"address":"PROGRAM_ID","cluster":"devnet"}'
```

## Milestone 1 guarantees

- Program IDs are validated as 32-byte base58 addresses.
- Only executable loader-v3 Program accounts are accepted.
- ProgramData ownership and state variants are validated before parsing.
- Executable bytes always begin after the fixed 45-byte ProgramData metadata header.
- SHA-256 deployment fingerprints exclude observation time and RPC context slot.
- WebSocket messages are wake-up signals; finalized HTTP reads create evidence.
- Polling and reconnect reconciliation recover missed WebSocket notifications.
- Database uniqueness yields exactly-once snapshots/events over at-least-once work.
- Executable and authority transitions are deterministic, rule-versioned events.

See [docs/MILESTONE_1_PROOF.md](docs/MILESTONE_1_PROOF.md) for the mandatory real-upgrade acceptance test.

## Milestone 2 security diff

The deterministic rule engine compares stored snapshots and persists one typed security event per matching rule. See [docs/security-rules.md](docs/security-rules.md).

Print the latest stored diff for a program:

```bash
pnpm security:diff -- PROGRAM_ID
```

## Milestone 3 IDL and source intelligence

Canonical Program Metadata IDLs are normalized and stored with each snapshot. Instruction account, signer, mutability, argument, account-type, and error-definition changes are emitted as structured evidence. Missing metadata never disables executable monitoring.

Print the same diff as structured JSON:

```bash
pnpm security:diff -- PROGRAM_ID --json
```

See [docs/idl-source-intelligence.md](docs/idl-source-intelligence.md) for retrieval, confidence, and fallback behavior.

## Deployment

Deploy only `apps/web` to Vercel. The monitor worker requires a persistent process and must run on a container/worker host with the same organization-owned environment variables and database. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Use Supabase for durable storage and Vercel for `apps/web`. The persistent monitor runs separately because request-scoped Vercel Functions do not own long-lived WebSocket subscriptions. The source product specification is `UseKratose_Master_Product_Technical_Documentation.pdf`.

Architecture, decisions, API, threat model, and demo instructions are maintained in `docs/architecture.md`, `docs/decisions.md`, `docs/api.md`, `docs/threat-model.md`, and `docs/demo-plan.md`.
