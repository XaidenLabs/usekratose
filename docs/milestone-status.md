# Milestone status

Last audited: 2026-09-25

| Milestone                     | Status                                 | Evidence                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Solana monitoring core    | **VALIDATED; LIVE RECOVERY GATE OPEN** | Real devnet v1→v2 upgrade detected automatically; current on-chain state matches stored evidence; parser, RPC validation, WebSocket lifecycle, polling reconciliation, concurrent-writer ordering, repeated-state history, and Supabase dedupe tests pass. A separate WebSocket-disabled devnet upgrade remains required before production-readiness is declared. |
| 2 — Deterministic diff/events | **PASS**                               | Executable, deployment slot, authority, immutability, owner, executable-state, ProgramData, IDL, instruction, and stale-verification rules persist deduplicated events.                                                                                                                                                                                           |
| 3 — IDL/source intelligence   | **PASS**                               | Anchor/Codama normalization, artifacts, source references, schema deltas, no-IDL fallback, and stored v1→v2 fixture acceptance pass.                                                                                                                                                                                                                              |
| 4 — Alerts/notifications      | **PASS**                               | Signed webhook and in-app deliveries, encrypted secrets, persistent outbox, disabled destinations, retries, and dedupe pass.                                                                                                                                                                                                                                      |
| 5 — Public API                | **PASS**                               | Required endpoints, project-scoped hashed keys, revocation, database rate limiting, request logs, and live devnet ingestion pass.                                                                                                                                                                                                                                 |
| 6 — MVP dashboard             | **PASS**                               | Landing, onboarding, console, history, change evidence, alert/API settings, and responsive browser verification pass.                                                                                                                                                                                                                                             |
| 7 — AI explanation            | **PASS / OPTIONAL PROVIDER**           | Structured evidence-only OpenAI Responses integration persists provider/model/prompt/input/output; deterministic behavior is unchanged when no key is configured.                                                                                                                                                                                                 |
| 8 — Profiles/onboarding       | **PASS**                               | Public program profiles, pending/manual claims, real metrics, evidence-first language, and live program profile pass.                                                                                                                                                                                                                                             |
| 9 — Demo/submission           | **READY WITH MANUAL RECORDING GATE**   | Demo program, live deployment evidence, scripted runbook, dashboard/API/alert flow, and fixture IDL transition exist. Final video recording and any new devnet transaction remain human actions.                                                                                                                                                                  |

## Automated verification

- Strict TypeScript compilation across eight workspace projects.
- 47 tests including database-backed snapshot→event→alert→API-key acceptance.
- Six PostgreSQL/Supabase migrations applied successfully to a clean local PostgreSQL 16 database.
- Production Next.js and monitor builds.
- Browser verification of landing, dashboard, onboarding, public profile, alerts, and API pages without error overlays.
- Live API ingestion of devnet program `3xePxdAmkJtAQnawuVzsBn2KfaG3pEndPV9CWT6bNTWd`.

## Remaining external configuration

1. Fill Supabase and Vercel environment values from `.env.example`.
2. Run migrations against the Supabase server connection.
3. Link the organization-owned Vercel project and deploy `apps/web`.
4. Deploy one persistent monitor worker per Solana cluster.
5. Record the final demo. Any new Solana transaction requires explicit review and approval.

The Vercel CLI is authenticated to organization scope `xhealzs-projects`, but Vercel currently rejects project linking because the team exceeded its fair-use limit. Resolve that organization billing/platform gate, fill the environment values, then run the documented Vercel link and production deploy commands.
