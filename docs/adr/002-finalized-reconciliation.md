# ADR 002: Finalized HTTP reads are authoritative

Status: accepted

## Decision

Treat `accountSubscribe` notifications as wake-up signals only. Build snapshots and events exclusively from fresh `getAccountInfo` reads using finalized commitment.

## Rationale

Sockets can replay, disconnect, or report a state before the application processes finality. Finalized reconciliation gives one evidence path for socket, polling, startup, and reconnect triggers.

## Consequences

Detection latency includes provider finality delay. Every notification costs an HTTP reconciliation, so per-program in-process serialization and provider rate controls are required.
