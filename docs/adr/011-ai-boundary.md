# ADR 011: Non-authoritative AI explanations

- Date: 2026-09-20
- Status: Accepted

## Context

Models can explain evidence but cannot reliably determine blockchain facts or prove program safety.

## Decision

Models receive only stored event type, rule severity, snapshot identifiers, program address, and structured evidence. Strict structured output contains summary, conditional impact, review areas, auditor questions, remediation checklist, and an explicit caveat. Provider, model, prompt version, input, evidence hash, and output are persisted.

Program-level analysis uses Gemini structured output. Its input is assembled server-side from the authenticated workspace's stored program, snapshots, deterministic security events, IDL metadata, verification status, and source references. The browser never sends arbitrary evidence or the provider key.

The model may propose corrections, reasons, fixes, and review priorities, but it cannot assign authoritative severity. UseKratose discards unknown event and snapshot references, then derives each correction's displayed severity from the highest-severity referenced deterministic event. A correction with no valid event reference is informational.

Analysis is cached by program, current snapshot, canonical evidence hash, provider, model, and prompt version. This makes repeated requests idempotent while ensuring a changed evidence set creates a new analysis record.

## Alternatives

- Sending arbitrary source or on-chain text directly increases prompt-injection and hallucination risk.
- Allowing AI risk scores would undermine the deterministic product claim.
- Letting the model assign severity would make the same on-chain evidence non-deterministic.

## Tradeoffs

Explanations are unavailable without a configured provider. The deterministic event remains fully useful and authoritative.

Source and IDL fields are treated as untrusted evidence. Gemini is instructed to avoid code-specific claims when those layers are unavailable, so the product degrades to review guidance rather than fabricated findings.
