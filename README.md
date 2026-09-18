# UseKratose

UseKratose is continuous security verification for Solana programs. Milestone 1 detects loader-v3 deployment and authority changes from deterministic on-chain evidence.

This repository intentionally contains no frontend and no AI. The Next.js app is currently an API-only control plane, ready for the frontend to be added in a later milestone.

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
programs/
  demo-upgradeable/  Reproducible v1/v2 Solana upgrade proof program
docs/
  adr/          Architectural decision records
```

The `programs/` directory owns on-chain programs. The Next.js application owns future frontend code and current backend route handlers. Shared domain behavior does not live inside Next.js, so workers and future services can reuse it without importing framework code.

## Quick start

Requirements: Node.js 22+, pnpm 10+, and PostgreSQL 15+.

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

## Deployment

Deploy only `apps/web` to Vercel. The monitor worker requires a persistent process and must run on a container/worker host with the same organization-owned environment variables and database. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

The source product specification is `UseKratose_Master_Product_Technical_Documentation.pdf`.
