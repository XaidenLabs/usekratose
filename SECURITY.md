# Security policy

UseKratose processes security-sensitive deployment evidence. Reports are handled privately and prioritized by impact to authentication, tenant isolation, monitoring correctness, alert integrity, or secret handling.

## Reporting a vulnerability

Do not open a public issue. Use the repository's private [GitHub vulnerability reporting form](https://github.com/XaidenLabs/usekratose/security/advisories/new) with:

- the affected endpoint, component, or program;
- reproduction steps and required account state;
- the security impact and any known exploitation;
- a safe proof of concept, if available.

Do not access data belonging to other users, degrade production monitoring, or publish a report before remediation is coordinated.

## Response targets

- Acknowledgement: within two business days.
- Initial severity assessment: within five business days.
- Critical containment target: within 24 hours of validation.
- Coordinated disclosure timing: agreed with the reporter after remediation.

## Scope

In scope are `usekratose.site`, its authenticated dashboard and APIs, the monitor worker, webhook delivery, GitHub integration, and the deterministic evidence pipeline. Third-party services and vulnerabilities requiring social engineering are out of scope unless they expose a UseKratose implementation flaw.

## Security guarantees

UseKratose reports observed deployment-state changes. It does not certify that a Solana program is vulnerability-free. The precise evidence model and limitations are documented in [`docs/security-methodology.md`](docs/security-methodology.md).
