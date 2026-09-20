# Vercel and worker deployment

## Vercel project

Create one Vercel project under the organization and select this repository. Set the project Root Directory to `apps/web`, enable access to source files outside the Root Directory, and use the committed `apps/web/vercel.json` settings.

Required Vercel environment variables:

- `SUPABASE_DATABASE_URL` — Supabase transaction-pooler URI on port 6543
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `API_KEY_PEPPER` — at least 32 random characters
- `CONTROL_PLANE_TOKEN` — high-entropy server administration token
- `ALERT_SECRET_ENCRYPTION_KEY` — 32 random bytes encoded as base64
- `DEFAULT_PROJECT_ID`
- `SOLANA_DEVNET_RPC_HTTP_URL`
- `SOLANA_MAINNET_RPC_HTTP_URL` for mainnet ingestion
- `OPENAI_API_KEY` and `AI_EXPLANATION_MODEL` only when explanations are enabled

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

- `SUPABASE_DATABASE_URL` — direct or session-pooler URI for the persistent host
- `SOLANA_CLUSTER`
- `SOLANA_RPC_HTTP_URL`
- `SOLANA_RPC_WS_URL`
- `RECONCILIATION_INTERVAL_MS`
- `PORTFOLIO_REFRESH_INTERVAL_MS`
- `WS_RECONNECT_BASE_DELAY_MS`
- `ALERT_SECRET_ENCRYPTION_KEY`
- `ALERT_DELIVERY_INTERVAL_MS`
- `OPENAI_API_KEY`, `AI_EXPLANATION_MODEL`, and `AI_EXPLANATION_INTERVAL_MS` when enabled

Worker command:

```bash
pnpm --filter @usekratose/monitor build
pnpm --filter @usekratose/monitor start
```

Run one worker deployment per cluster. Run database migrations as a release step before promoting the Vercel deployment or worker artifact.

## Production notes

- Run `pnpm db:migrate` against the server-only Supabase connection before deployment.
- Never expose `SUPABASE_DATABASE_URL`, a service-role key, API pepper, control token, or encryption key through `NEXT_PUBLIC_` variables.
- Vercel uses transaction pooling, `max: 1`, TLS, and prepared statements disabled.
- Product tables enable RLS and revoke direct `anon`/`authenticated` table access.
- Keep HTTP and WebSocket endpoints on the same cluster.
- Configure provider limits and alert on RPC 429/error rates.
- Run a single worker replica for Milestone 1. Multiple replicas remain safe at the database boundary but duplicate upstream subscriptions until leases are implemented.
