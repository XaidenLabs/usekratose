# ADR 020: Single-origin console routing

## Status

Accepted.

## Context

UseKratose keeps the marketing application and authenticated console in separate Next.js applications so they can be owned, tested, and deployed independently. Users must still experience one public product origin, with the console below `/dashboard`, and server-only credentials must not cross into the browser bundle.

## Decision

- `apps/web` is the public entry application and owns the production domain.
- `apps/dashboard` is built with the fixed `/dashboard` base path.
- `apps/web` proxies `/dashboard` and `/dashboard/*` to the dashboard deployment through a `beforeFiles` rewrite.
- `NEXT_PUBLIC_DASHBOARD_URL` points to the public origin plus `/dashboard`; it never exposes the child deployment URL.
- `DASHBOARD_ORIGIN` is server-only and points to the dashboard deployment origin.
- Browser-native requests created by the dashboard explicitly include the base path. Next.js `Link`, router, and server redirect APIs retain their built-in base-path behavior.
- Request-scoped APIs may run with `apps/web` on Vercel. The persistent Solana monitor remains a separate long-running process.

## Consequences

- Marketing and console releases remain independent while public navigation stays same-origin.
- Authentication cookies and Supabase sessions work through the public domain without cross-origin browser configuration.
- The dashboard deployment must be deployed before the public web deployment so `DASHBOARD_ORIGIN` can be configured.
- Shared hosting that only exposes Nginx Unit is not treated as a reliable persistent-worker host. The monitor requires a supervisor such as systemd, Docker, or an equivalent always-on process manager.
