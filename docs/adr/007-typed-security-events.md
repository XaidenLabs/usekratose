# ADR 007: Typed events are emitted per deterministic rule

Status: accepted

## Decision

Milestone 2 stores one `SecurityEvent` row per matching rule instead of one aggregate event containing several type labels. A separate `SnapshotDiff` records every comparable field, including changes that do not have a dedicated event type.

## Rationale

Independent typed events make severity, evidence, filtering, and downstream alert policies explicit. They also let a combined upgrade produce both `PROGRAM_UPGRADED` and `AUTHORITY_CHANGED` without hiding either transition inside an aggregate payload.

## Consequences

Deduplication is enforced per snapshot pair and event type. Event rules carry version `2`. Metadata and source-reference changes remain visible in the diff and create `VERIFICATION_STALE` only when previous trust is invalidated.
