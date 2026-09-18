# ADR 006: Vercel control plane with persistent monitor worker

Status: accepted

## Decision

Deploy the API-only Next.js app to Vercel and deploy the WebSocket monitor as a separate persistent Node.js process.

## Rationale

Vercel is appropriate for organization-managed web/API delivery, previews, and future frontend work. Solana subscriptions require long-lived connection ownership, reconnect state, and periodic scheduling that request-scoped functions do not provide.

## Consequences

Two runtime deployments share PostgreSQL and RPC configuration. Operational health must distinguish API availability from monitoring health. A later Vercel-native queue or cron may enqueue reconciliation but does not replace socket ownership.
