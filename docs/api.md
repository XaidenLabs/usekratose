# Public API

Base path: `/api/v1`

Send `Authorization: Bearer uk_…` on every product API request. Raw keys are shown only when created. Responses include `x-request-id`; authenticated responses include `x-ratelimit-remaining`.

## Endpoints

### `POST /programs`

```json
{
  "address": "3xePxdAmkJtAQnawuVzsBn2KfaG3pEndPV9CWT6bNTWd",
  "network": "devnet"
}
```

Validates and resolves the loader-v3 program, attaches it to the key's project, and creates a baseline if one does not exist.

### `GET /programs`

Lists programs belonging to the key's project.

### `GET /programs/:programId`

Returns the program, latest snapshot, current security state, and recent events. `programId` accepts the database ID or Solana program address.

### `GET /programs/:programId/snapshot`

Returns the current complete snapshot.

### `GET /programs/:programId/history`

Returns newest-first version snapshots.

### `GET /programs/:programId/events`

Returns newest-first deterministic security events.

### `GET /programs/:programId/security`

```json
{
  "program": "…",
  "network": "devnet",
  "status": "stale",
  "upgradeable": true,
  "upgradeAuthority": "…",
  "currentHash": "sha256:…",
  "verifiedHash": "sha256:…",
  "lastChange": "2026-09-20T12:00:00.000Z",
  "latestSeverity": "high"
}
```

Security states are `unknown`, `unverified`, `current`, `stale`, `review_required`, and `immutable`. None means “safe.”

### `POST /programs/:programId/claim`

Submits a manual ownership claim for the key's project. New claims remain `pending` until reviewed.

## Control-plane endpoints

The following server-administration endpoints use `CONTROL_PLANE_TOKEN`, not a project API key:

- `POST /projects/:projectId/api-keys`
- `DELETE /projects/:projectId/api-keys/:apiKeyId`
- `GET /projects/:projectId/api-keys`
- `POST /projects/:projectId/alerts`
- `GET /projects/:projectId/alerts`

These endpoints are intended for the organization-owned console backend until user authentication is introduced.

## Errors

Errors use `{ "error": { "code": "…", "message": "…" } }`. Important statuses are `400` invalid request, `401` invalid key, `404` missing/project-inaccessible resource, `422` unsupported program or unsafe destination, `429` rate limit, `502` upstream RPC failure, and `503` missing deployment configuration.
