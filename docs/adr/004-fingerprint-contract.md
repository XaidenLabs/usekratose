# ADR 004: Fingerprint normalized deployment state

Status: accepted

## Decision

Hash executable bytes from offset 45 with SHA-256, hash the full ProgramData payload separately, then fingerprint canonical normalized fields. Exclude observation timestamp and RPC context slot.

## Rationale

The fixed offset follows loader-v3's ProgramData metadata size even when authority is null. Excluding observer-local facts makes fingerprints stable across workers and providers while preserving those facts on snapshots for auditability.

## Consequences

Any byte-level account change produces a new account hash. Executable-only and authority-only changes remain distinguishable. Changing the fingerprint contract requires an explicit version migration.
