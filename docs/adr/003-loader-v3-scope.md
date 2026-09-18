# ADR 003: Loader-v3 is the only Milestone 1 loader

Status: accepted

## Decision

Accept only executable programs owned by `BPFLoaderUpgradeab1e11111111111111111111111`. Validate loader state variants and monitor the resolved ProgramData account.

## Rationale

Loader-v3 has a deterministic Program-to-ProgramData relationship, fixed metadata layout, explicit deployment slot, and upgrade authority. Supporting additional loaders without equivalent semantics would weaken event correctness.

## Consequences

Other loaders fail as unsupported instead of receiving misleading monitoring status. Loader-v4 requires a future loader-specific snapshot contract and ADR.
