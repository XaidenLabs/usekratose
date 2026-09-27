# ADR 017: Keep program management workspace-scoped

## Status

Accepted.

## Context

A Solana program address and its observed deployment evidence are global facts, while the name a customer assigns to that program is workspace-specific. A single program can be monitored by multiple organizations under different internal names. Historical snapshots must not be rewritten when a user changes presentation settings or removes a monitor.

## Decision

- Store the user-defined display name on `organization_program_monitors`, not on the global `programs` record.
- Keep the program address immutable after ingestion.
- Treat a network change as a new validated baseline for the same address on the target cluster. Attach the target monitor first, then detach the prior cluster monitor only after ingestion succeeds.
- Treat deletion as removal of the workspace monitor relationship. Preserve the global program, snapshots, security events, and evidence for auditability and for other workspaces.

## Consequences

- Existing monitored programs can be renamed directly without deletion or re-ingestion.
- Failed network changes leave the existing monitor intact.
- A removed program disappears from the workspace but its historical evidence remains immutable.
- The dashboard API remains the authorization boundary for all monitor mutations.
