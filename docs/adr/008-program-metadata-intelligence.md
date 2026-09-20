# ADR 008: Program Metadata is the first automatic intelligence source

Status: accepted

## Decision

Milestone 3 retrieves canonical `idl` and `security` records from the Solana Program Metadata Program during ingestion and every finalized reconciliation. The adapter uses the official `@solana-program/program-metadata` client with `@solana/kit`. Core and application packages depend only on a `ProgramIntelligenceGateway` port and normalized domain types.

## Rationale

Program Metadata is deterministic by program address and supports direct, external-account, and URL-backed content. It is the current storage path used by Anchor while preserving framework independence in UseKratose. Keeping retrieval behind a port allows later registries or verified-build providers without changing snapshot or event rules.

## Consequences

- A confirmed missing metadata account is stored as unavailable.
- A transport, decode, or remote-content failure does not erase previously stored intelligence.
- IDLs are normalized before hashing and persistence, so JSON key order and non-semantic ordering do not create changes.
- Canonical metadata proves who can update the metadata account; it does not prove that source code produced deployed bytecode. Source verification therefore remains a separate explicit status.
- URL-backed metadata is untrusted input. It is disabled by default, requires an exact HTTPS hostname allowlist, follows at most two allowlisted redirects, and enforces a 1 MB response limit. Infrastructure egress controls remain defense in depth.
- Legacy Anchor IDL accounts and arbitrary bytecode decompilation are outside this milestone. They can be added as separate providers later.
