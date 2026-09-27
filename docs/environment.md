# Environment configuration

The repository uses one root `.env.local` for local development. The Next.js
application, monitor worker, migrations, and monitor CLI commands load it. Real
process environment variables retain precedence in hosted environments.

## Supabase

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` identify
the browser client. The publishable key is intentionally public and all exposed
tables must remain protected by row-level security.

Backend storage uses `SUPABASE_DATABASE_URL`, not the publishable key. In the
Supabase dashboard, open **Connect**, choose **Transaction pooler**, copy the URI,
and replace the password placeholder with the database password. The expected
port is `6543`. This connection is used by Vercel serverless functions with a
one-connection application pool, disabled prepared statements, and required
TLS.

For a persistent monitor worker, a direct or session-pooler URL is preferable.
Until the worker is hosted separately, local development may use `DATABASE_URL`
for local Postgres while Vercel uses `SUPABASE_DATABASE_URL`.

Never prefix database URLs, control-plane tokens, peppers, encryption keys, or
provider secrets with `NEXT_PUBLIC_`.

## Solana RPC providers

UseKratose routes providers by cluster. When `SOLAMI_API_KEY` is present,
mainnet-beta finalized reads use Solami first and retry through
`SOLANA_MAINNET_RPC_HTTP_URL` after a transport or RPC failure. Devnet continues
to use `SOLANA_RPC_HTTP_URL` or `SOLANA_DEVNET_RPC_HTTP_URL` and never queries
the mainnet-only Solami endpoint.

```dotenv
SOLAMI_API_KEY=
SOLAMI_RPC_URL=https://rpc.solami.dev/sol
SOLAMI_RPC_WS_URL=
SOLANA_DEVNET_RPC_HTTP_URL=https://api.devnet.solana.com
SOLANA_MAINNET_RPC_HTTP_URL=https://api.mainnet-beta.solana.com
```

Keep `SOLAMI_API_KEY` server-only. `SOLAMI_RPC_WS_URL` is optional and should be
set only to a verified standard Solana WebSocket endpoint issued by Solami. If
it is absent, the persistent worker keeps using `SOLANA_RPC_WS_URL`; finalized
HTTP reconciliation through Solami remains authoritative.

## Gemini analysis

Program-level AI analysis is optional and server-side only:

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
```

Create the key in Google AI Studio, place it only in the root `.env.local`, and
restart the marketing/API development server after changing it. The dashboard
calls the authenticated UseKratose API and never receives this key. If the key
is absent, deterministic monitoring, diffs, events, and evidence inspection
continue to work; only the AI Analysis action reports that it is unavailable.

## Source evidence and GitHub fixes

Run `pnpm db:migrate`. Migrations `0011` and `0012` create the relational source
evidence model plus the private `program-artifacts` bucket and user-scoped
storage policies. The equivalent storage migration also lives under
`supabase/migrations` for Supabase CLI deployments.

Uploaded source, IDLs, and `.so` build artifacts use Supabase Storage. Source is
read as bounded UTF-8 text, IDLs are normalized and hashed, and `.so` files are
hashed only. Uploaded binaries are never executed or decompiled.

Private repository access and reviewable fixes use a GitHub App:

```dotenv
GITHUB_APP_ID=
GITHUB_APP_SLUG=
GITHUB_APP_PRIVATE_KEY=
GITHUB_STATE_SECRET=
GITHUB_API_VERSION=2026-03-10
```

Grant the GitHub App `Metadata: Read`, `Contents: Read and write`, and `Pull
requests: Read and write`. Set its Setup URL to `/github/setup` on the dashboard
origin, for example `http://localhost:3001/github/setup` locally. Store the PEM
private key only in the marketing/API application. Escaped `\\n` line breaks are
accepted for Vercel environment variables. `GITHUB_STATE_SECRET` must be a
random server-only value of at least 32 characters.

Autofix never modifies the default branch or deploys a program. GitHub fixes are
committed to a dedicated `usekratose/fix-*` branch and delivered as a pull
request; uploaded source is changed only after an explicit finding-level user
decision.

## Generated local secrets

The following values are random application secrets and may be generated
locally:

- `ALERT_SECRET_ENCRYPTION_KEY`: 32 random bytes encoded as base64.
- `API_KEY_PEPPER`: random server-only secret of at least 32 characters.
- `CONTROL_PLANE_TOKEN`: random bearer token for administrative API routes.

Do not commit `.env.local`. Store the production equivalents as encrypted
Vercel environment variables.

## Separate Vercel applications

Create two Vercel projects from the same repository:

- Marketing/API project root: `apps/web`
- Authenticated console project root: `apps/dashboard`

Configure these URLs for local development:

```dotenv
NEXT_PUBLIC_MARKETING_URL=http://localhost:3000
NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3001
NEXT_PUBLIC_USEKRATOSE_API_URL=http://localhost:3000
USEKRATOSE_API_URL=http://localhost:3000
```

In Vercel, replace the localhost values with the production marketing, console,
and API origins. `USEKRATOSE_API_URL` is server-only; the `NEXT_PUBLIC_` API URL
is used only where the console must display a public endpoint. Both projects
must receive the same Supabase URL and publishable key. Only `apps/web` receives
database credentials, `GEMINI_API_KEY`, and other backend secrets.
