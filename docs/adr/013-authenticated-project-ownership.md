# ADR 013: Authenticated project ownership

## Status

Accepted.

## Decision

Supabase Auth establishes user identity, while the UseKratose server-side
Postgres connection enforces application ownership. Each authenticated user may
own one project through `projects.owner_user_id`. Legacy, public-demo, and
control-plane projects may remain unowned.

Authenticated onboarding never accepts a project identifier from the browser.
The server resolves the project from the verified Supabase user ID before it
creates monitors or alert destinations. Internal control-plane credentials are
not forwarded through self-referential HTTP requests.

Dashboard queries require a verified session and an owned project. They never
fall back to the shared demo project for an authenticated user. Product metrics
are filtered by that project as well.

## Security consequences

- A user cannot rename, monitor programs for, or configure alerts for another
  project by changing a request body.
- Project identifier collisions cannot transfer ownership.
- Open redirects are rejected before password or OAuth navigation.
- Protected routes fail closed when authentication configuration is missing.
- Public program evidence remains public; authentication protects management
  surfaces, not public verification profiles.
- Password recovery remains reachable after Supabase creates a recovery
  session, instead of being redirected away as an already authenticated user.

## Supabase boundary

The browser uses only the publishable key. Database URLs and encryption keys
remain server-only. Public tables keep RLS enabled and grants revoked; current
application writes go through the controlled server-side Postgres connection.
