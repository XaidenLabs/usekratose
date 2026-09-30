# Release process

Production releases use a protected `main` branch and Vercel Git integration.

## Required repository settings

1. Protect `main` and require pull requests.
2. Require the `quality` and `database` CI checks.
3. Require branches to be current before merging.
4. Block force pushes and branch deletion.
5. Enable GitHub secret scanning, push protection, Dependabot alerts, and private vulnerability reporting.
6. Configure `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` as Actions secrets for a dedicated least-privileged test account.

## Promotion checklist

1. CI passes typechecking, tests, database acceptance tests, and production builds.
2. The Vercel preview passes the production smoke workflow with `E2E_BASE_URL` set to the preview origin.
3. Database migrations are applied before web or worker promotion.
4. The dashboard deploys before the public web project when their API contract changes.
5. `/api/health`, authentication, onboarding, dashboard loading, and logout are verified through the public origin.
6. The monitor worker reports successful finalized reconciliation after restart.
7. Production logs are checked for authentication, API, and monitor errors.

## Rollback

Promote the last known-good Vercel deployment and restore the matching worker artifact. Database migrations must be backward compatible; destructive migrations require a separate reviewed release and verified backup.
