# Vercel and worker deployment

## Public topology

UseKratose uses two independently deployable Next.js projects behind one public origin:

- `apps/web` owns `https://<public-domain>/` and the request-scoped API routes.
- `apps/dashboard` is built with `basePath=/dashboard`.
- `apps/web` rewrites `https://<public-domain>/dashboard/*` to the private dashboard deployment origin.
- `apps/monitor` runs on an always-on Node.js host and is never started inside a Vercel Function.

Deploy the dashboard first. Set `DASHBOARD_ORIGIN` on the web project to the dashboard deployment origin, while setting `NEXT_PUBLIC_DASHBOARD_URL` to `https://<public-domain>/dashboard`.

## Dashboard Vercel project

Set the project Root Directory to `apps/dashboard` and allow source files outside the root directory.

Required variables:

- `NEXT_PUBLIC_DASHBOARD_BASE_PATH=/dashboard`
- `NEXT_PUBLIC_MARKETING_URL=https://<public-domain>`
- `NEXT_PUBLIC_USEKRATOSE_API_URL=https://<public-domain>`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The dashboard must not receive database URLs, Gemini keys, GitHub private keys, encryption keys, or control-plane secrets.

## Web and API Vercel project

Set the project Root Directory to `apps/web` and allow source files outside the root directory.

Required variables:

- `DASHBOARD_ORIGIN=https://<dashboard-project-domain>`
- `NEXT_PUBLIC_DASHBOARD_URL=https://<public-domain>/dashboard`
- `NEXT_PUBLIC_MARKETING_URL=https://<public-domain>`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_DATABASE_URL` using the transaction pooler
- `API_KEY_PEPPER`
- `CONTROL_PLANE_TOKEN`
- `ALERT_SECRET_ENCRYPTION_KEY`
- cluster-specific Solana and Solami RPC variables
- `GEMINI_API_KEY` and `GEMINI_MODEL` when AI review is enabled
- `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_STATE_SECRET`, and `GITHUB_API_VERSION`

Use the committed `vercel.json` in each project. Never commit production credentials.

## Persistent monitor

The monitor requires a continuously running Node.js process with outbound HTTP and WebSocket access. Use a VPS or another host with systemd, Docker, or an equivalent supervisor. Nginx Unit alone is an application server, not a generic background-process supervisor, so a shared DirectAdmin account is not accepted as the monitor host unless the provider explicitly enables persistent Node processes.

Required worker variables:

- `SUPABASE_DATABASE_URL`
- `SOLANA_CLUSTER`
- `SOLANA_RPC_HTTP_URL`
- `SOLANA_RPC_WS_URL`
- `SOLAMI_API_KEY` and `SOLAMI_RPC_URL` for Solami-first mainnet reads
- `SOLAMI_RPC_WS_URL` only when the provider issues a standard Solana WebSocket endpoint
- reconciliation, portfolio refresh, reconnect, and alert-delivery intervals
- alert encryption and optional explanation-provider variables

Build and start:

```bash
pnpm --filter @usekratose/monitor build
pnpm --filter @usekratose/monitor start
```

Run one monitor per cluster. Apply database migrations before promoting a web release or restarting the worker.

## Release verification

1. Build and test the dashboard, web application, monitor, and packages.
2. Deploy the dashboard and verify `/dashboard/login` on its deployment origin.
3. Configure the web project's `DASHBOARD_ORIGIN` and deploy the public application.
4. Verify `/`, `/dashboard/overview`, and authenticated dashboard API operations through the public origin.
5. Restart the persistent monitor and confirm finalized reconciliation writes a fresh health observation.
6. Scan Vercel and worker logs for errors before announcing the release.
