# Architectural decisions

| ADR                                             | Decision                                                           | Status   |
| ----------------------------------------------- | ------------------------------------------------------------------ | -------- |
| [001](adr/001-monorepo-boundaries.md)           | Keep framework, chain, domain, and persistence boundaries separate | Accepted |
| [002](adr/002-finalized-reconciliation.md)      | Treat WebSockets as signals and finalized HTTP as evidence         | Accepted |
| [003](adr/003-loader-v3-scope.md)               | Limit MVP ingestion to validated loader-v3 programs                | Accepted |
| [004](adr/004-fingerprint-contract.md)          | Hash canonical deployment state without observation time           | Accepted |
| [005](adr/005-idempotent-storage.md)            | Enforce snapshot and event idempotency in PostgreSQL               | Accepted |
| [006](adr/006-vercel-runtime-split.md)          | Deploy Next.js to Vercel and monitoring as a persistent worker     | Accepted |
| [007](adr/007-typed-security-events.md)         | Use explicit deterministic event and severity rules                | Accepted |
| [008](adr/008-program-metadata-intelligence.md) | Treat IDL/source intelligence as optional evidence                 | Accepted |
| [009](adr/009-alert-outbox.md)                  | Persist alert deliveries before external I/O                       | Accepted |
| [010](adr/010-api-access.md)                    | Use project-scoped hashed API keys and database rate limits        | Accepted |
| [011](adr/011-ai-boundary.md)                   | Restrict AI to explanations over deterministic evidence            | Accepted |
| [012](adr/012-supabase-storage.md)              | Use Supabase Postgres as the production system of record           | Accepted |
