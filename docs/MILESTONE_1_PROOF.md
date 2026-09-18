# Milestone 1 deterministic upgrade proof

Milestone 1 is complete only after this runbook detects an actual upgrade to the same Solana devnet Program ID. Unit fixtures prove parser and idempotency behavior, but they do not replace this live acceptance test.

## Safety and prerequisites

Use devnet only. Keep the deployment keypair under your control and outside this repository. UseKratose never needs that keypair; it only reads public accounts. Review and execute deployment transactions yourself.

Required tooling:

- Solana CLI configured for devnet
- Rust and `cargo build-sbf`
- PostgreSQL with migration `0001_milestone_1.sql`
- HTTP and WebSocket RPC endpoints for the same devnet provider/cluster

## 1. Build and deploy v1

```bash
NO_DNA=1 cargo build-sbf --manifest-path programs/demo-upgradeable/Cargo.toml
NO_DNA=1 solana program deploy \
  programs/demo-upgradeable/target/deploy/usekratose_demo_upgradeable.so \
  --program-id /absolute/path/to/demo-program-keypair.json \
  --url devnet
```

Record the returned Program ID. Do not commit the keypair.

## 2. Start the proof observer

Load the environment variables from `.env`, then run:

```bash
pnpm db:migrate
pnpm proof:upgrade -- PROGRAM_ID
```

The command prints the baseline fingerprint, executable hash, and resolved ProgramData address, then waits on both finalized WebSocket notifications and 10-second reconciliation polling.

## 3. Build and deploy v2 to the same Program ID

```bash
NO_DNA=1 cargo build-sbf \
  --manifest-path programs/demo-upgradeable/Cargo.toml \
  --features v2
NO_DNA=1 solana program deploy \
  programs/demo-upgradeable/target/deploy/usekratose_demo_upgradeable.so \
  --program-id /absolute/path/to/demo-program-keypair.json \
  --url devnet
```

## Required evidence

The observer must exit after printing `UPGRADE_DETECTED_DETERMINISTICALLY` with:

- the same Program ID and ProgramData address;
- a different executable hash and fingerprint;
- a later deployment slot;
- a `PROGRAM_UPGRADED` event with high severity;
- unchanged authority unless authority was intentionally modified;
- exactly two snapshots and one transition event after duplicate polling.

Save the JSON output and transaction signatures in the hackathon evidence folder or CI artifact store. Do not proceed to frontend or AI milestones until this evidence exists.

## Recovery test

Repeat once with the WebSocket endpoint intentionally unavailable during deployment. Restore it after the upgrade. The 10-second proof poll must still detect the same finalized transition exactly once. This demonstrates that polling is a completeness mechanism, not just a health check.
