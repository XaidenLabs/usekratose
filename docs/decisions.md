# Architectural decisions

| ADR                                                 | Decision                                                           | Status   |
| --------------------------------------------------- | ------------------------------------------------------------------ | -------- |
| [001](adr/001-monorepo-boundaries.md)               | Keep framework, chain, domain, and persistence boundaries separate | Accepted |
| [002](adr/002-finalized-reconciliation.md)          | Treat WebSockets as signals and finalized HTTP as evidence         | Accepted |
| [003](adr/003-loader-v3-scope.md)                   | Limit MVP ingestion to validated loader-v3 programs                | Accepted |
| [004](adr/004-fingerprint-contract.md)              | Hash canonical deployment state without observation time           | Accepted |
| [005](adr/005-idempotent-storage.md)                | Enforce snapshot and event idempotency in PostgreSQL               | Accepted |
| [006](adr/006-vercel-runtime-split.md)              | Deploy Next.js to Vercel and monitoring as a persistent worker     | Accepted |
| [007](adr/007-typed-security-events.md)             | Use explicit deterministic event and severity rules                | Accepted |
| [008](adr/008-program-metadata-intelligence.md)     | Treat IDL/source intelligence as optional evidence                 | Accepted |
| [009](adr/009-alert-outbox.md)                      | Persist alert deliveries before external I/O                       | Accepted |
| [010](adr/010-api-access.md)                        | Use project-scoped hashed API keys and database rate limits        | Accepted |
| [011](adr/011-ai-boundary.md)                       | Restrict AI to explanations over deterministic evidence            | Accepted |
| [012](adr/012-supabase-storage.md)                  | Use Supabase Postgres as the production system of record           | Accepted |
| [013](adr/013-authenticated-project-ownership.md)   | Bind authenticated users to owned projects                         | Accepted |
| [014](adr/014-ordered-transition-history.md)        | Serialize transitions and preserve repeated states                 | Accepted |
| [015](adr/015-live-product-data-only.md)            | Render product pages from live persisted evidence only             | Accepted |
| [016](adr/016-standalone-dashboard-api-boundary.md) | Keep the dashboard separate behind authenticated APIs              | Accepted |
| [017](adr/017-workspace-program-management.md)      | Keep labels and monitor lifecycle workspace-scoped                 | Accepted |
| [018](adr/018-cluster-aware-rpc-failover.md)        | Route RPC providers by cluster with deterministic failover         | Accepted |
| [019](adr/019-reviewable-source-fixes.md)           | Ground source fixes and deliver them through reviewable changes    | Accepted |
| [020](adr/020-single-origin-console-routing.md)     | Route the separate console through one public `/dashboard` origin  | Accepted |
