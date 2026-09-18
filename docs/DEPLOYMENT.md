# Vercel and worker deployment

## Vercel project

Create one Vercel project under the organization and select this repository. Set the project Root Directory to `apps/web`, enable access to source files outside the Root Directory, and use the committed `apps/web/vercel.json` settings.

Required Vercel environment variables:

- `DATABASE_URL`
- `SOLANA_DEVNET_RPC_HTTP_URL`
- `SOLANA_MAINNET_RPC_HTTP_URL` for mainnet ingestion

Use Vercel Git integration for previews. For CLI deployment from an authenticated organization account:

```bash
vercel link --cwd apps/web --scope YOUR_VERCEL_TEAM
vercel deploy --cwd apps/web
vercel deploy --cwd apps/web --prod
```

No deployment credential belongs in source control. In CI, store `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as repository secrets and pin the Vercel CLI version.

## Monitor worker

Vercel Functions are request-scoped and do not own the persistent WebSocket loop. Deploy `apps/monitor` as a continuously running Node.js process on a container worker host under the same organization.

Required worker variables:

- `DATABASE_URL`
- `SOLANA_CLUSTER`
- `SOLANA_RPC_HTTP_URL`
- `SOLANA_RPC_WS_URL`
- `RECONCILIATION_INTERVAL_MS`
- `PORTFOLIO_REFRESH_INTERVAL_MS`
- `WS_RECONNECT_BASE_DELAY_MS`

Worker command:

```bash
pnpm --filter @usekratose/monitor build
pnpm --filter @usekratose/monitor start
```

Run one worker deployment per cluster. Run database migrations as a release step before promoting the Vercel deployment or worker artifact.

## Production notes

- Use a pooled PostgreSQL connection URL compatible with serverless functions.
- Keep HTTP and WebSocket endpoints on the same cluster.
- Configure provider limits and alert on RPC 429/error rates.
- Run a single worker replica for Milestone 1. Multiple replicas remain safe at the database boundary but duplicate upstream subscriptions until leases are implemented.
