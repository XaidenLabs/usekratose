# Colosseum demo plan

Target duration: 2 minutes 40 seconds.

## Controlled program

- Devnet Program: `3xePxdAmkJtAQnawuVzsBn2KfaG3pEndPV9CWT6bNTWd`
- ProgramData: `BQ7nb5gahFggtBSQEkpRZX7DvueqtFBkuD2PeYn4kVKa`
- Upgrade authority remains user-controlled.
- The demo program has no custody or real-fund behavior.

## Sequence

1. **Problem — 20 seconds**
   - “An audit verifies one version. An upgrade can invalidate those assumptions.”
   - Open the public profile and show the current fingerprint, authority, slot, and verification state.
2. **Baseline — 20 seconds**
   - Start `pnpm proof:upgrade -- PROGRAM_ID` against devnet.
   - Show the same program in the dashboard and API.
3. **Real upgrade — 35 seconds**
   - Display the exact devnet transaction summary.
   - After explicit signer approval, deploy v2 to the same Program ID.
4. **Automatic detection — 35 seconds**
   - The observer prints `UPGRADE_DETECTED_DETERMINISTICALLY`.
   - Dashboard shows the new fingerprint, deployment slot, authority comparison, version history, and `STALE` or `REVIEW_REQUIRED` state.
5. **Intelligence — 25 seconds**
   - Show the fixture-backed IDL acceptance transition from `deposit/withdraw` to `deposit/withdraw/adminWithdraw`.
   - Explain signer and writable-vault evidence. Do not imply arbitrary binary decompilation.
6. **Delivery and platform — 25 seconds**
   - Show the signed webhook event and the same state through `/api/v1/programs/:programId/security`.
7. **Close — 20 seconds**
   - Customers: protocols, auditors, wallets, exchanges, and security teams.
   - Model: free monitoring, paid continuous verification, API/security tooling, enterprise workflows.

## Commands

```bash
pnpm db:migrate
pnpm dev:monitor
pnpm dev
pnpm proof:upgrade -- PROGRAM_ID
pnpm proof:polling-recovery -- PROGRAM_ID
pnpm security:diff -- PROGRAM_ID
```

## Evidence policy

- Never expose keypair paths, seed phrases, API keys, or webhook secrets.
- Never claim fabricated users, integrations, revenue, or alerts.
- State clearly when IDL evidence is fixture-backed versus published on-chain metadata.
- A further devnet transaction always requires an explicit transaction summary and user approval.
