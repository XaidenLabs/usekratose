# ADR 010: Project-scoped API access

- Date: 2026-09-20
- Status: Accepted

## Context

The public API needs revocable machine access without exposing stored credentials.

## Decision

Generate opaque `uk_` keys, return the raw value once, and store only an HMAC-SHA256 digest plus a non-secret prefix. Every key belongs to one project. PostgreSQL applies fixed-window rate limits atomically and records request metadata without request bodies or raw keys.

## Alternatives

- JWTs add an identity-provider dependency before user authentication is in scope.
- Plain API-key hashes are more vulnerable if low-entropy formats are introduced later.

## Tradeoffs

The MVP control plane uses a server-side bootstrap token for key administration. A full user-session authorization layer remains post-hackathon work.
