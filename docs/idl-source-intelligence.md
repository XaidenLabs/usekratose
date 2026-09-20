# IDL and source intelligence

## Confidence layers

1. **Always:** program address, ProgramData address, executable fingerprint, deployment slot, owner, and upgrade authority.
2. **When available:** canonical Program Metadata IDL and security metadata.
3. **When available:** repository URL, revision, and explicit source-verification status.
4. **Later:** static analysis, simulation, and AI reasoning.

An absent or malformed higher layer never prevents Level 1 monitoring.

## Retrieval strategy

The Next.js ingestion API and monitor worker use `ProgramMetadataIntelligenceClient`. It requests the canonical `idl` and `security` seeds for the monitored program from the Program Metadata Program using finalized RPC reconciliation.

- A present `idl` record is parsed, normalized, hashed, and stored in the snapshot.
- A missing `idl` record produces `idl = null` and no instruction-level claims.
- A retrieval or parse failure omits fresh enrichment so an existing IDL is carried forward. This avoids reporting every instruction as removed during an RPC outage.
- Polling is the completeness mechanism for metadata-only updates because the worker currently subscribes to ProgramData changes, not metadata PDAs.

Program Metadata may resolve content stored directly, in another Solana account, or at a URL. All content is untrusted. URL retrieval is disabled unless `PROGRAM_METADATA_URL_HOST_ALLOWLIST` contains the exact HTTPS hostname. Responses are limited to 1 MB and redirects must remain allowlisted. The adapter accepts JSON only and never executes metadata. Production egress controls remain required defense in depth.

## Normalization

The normalizer accepts current Anchor/Solana IDL field names and legacy signer/mutability aliases. It stores sorted representations of:

- instructions;
- flattened instruction account requirements;
- signer, writable, and optional flags;
- argument names and canonical JSON type schemas;
- account type schemas;
- error codes, names, and messages.

Documentation, discriminators, and arbitrary top-level metadata are intentionally excluded from the semantic IDL hash. This keeps formatting and documentation-only edits from creating security events.

## Structured changes

`IDL_CHANGED` evidence contains instruction schema changes, account-type changes, and error-definition changes. `INSTRUCTION_ADDED` and `INSTRUCTION_REMOVED` remain separate typed events. Added-instruction evidence includes its normalized signer and writable accounts, enabling explainable severity rules without AI.

Source metadata recognizes `repository`, `repositoryUrl`, or `source_code` and revision equivalents. Presence defaults to `unverified`; only an explicit supported status becomes `verified`. A repository reference is not treated as a reproducible-build attestation.

## CLI

Human-readable latest stored diff:

```bash
pnpm security:diff -- PROGRAM_ID
```

Structured JSON for downstream tooling:

```bash
pnpm security:diff -- PROGRAM_ID --json
```
