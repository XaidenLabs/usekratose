# ADR 001: Organization-ready monorepo boundaries

Status: accepted

## Decision

Use `programs/` for on-chain programs, `apps/web` for the Next.js frontend/backend application, `apps/monitor` for persistent monitoring, and framework-independent `packages/` for domain and adapters.

## Rationale

The future frontend and current backend stay in one deployable Next.js product while monitoring remains portable to a persistent runtime. Workspace packages establish ownership boundaries suitable for an organization without creating premature network services.

## Consequences

Vercel deploys only `apps/web`. Package APIs must remain framework-neutral. The worker and web app share versioned code and one lockfile.
