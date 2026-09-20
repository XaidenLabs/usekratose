# ADR 011: Non-authoritative AI explanations

- Date: 2026-09-20
- Status: Accepted

## Context

Models can explain evidence but cannot reliably determine blockchain facts or prove program safety.

## Decision

Models receive only stored event type, rule severity, snapshot identifiers, program address, and structured evidence. Strict structured output contains summary, conditional impact, review areas, auditor questions, remediation checklist, and an explicit caveat. Provider, model, prompt version, input, evidence hash, and output are persisted.

## Alternatives

- Sending arbitrary source or on-chain text directly increases prompt-injection and hallucination risk.
- Allowing AI risk scores would undermine the deterministic product claim.

## Tradeoffs

Explanations are unavailable without a configured provider. The deterministic event remains fully useful and authoritative.
