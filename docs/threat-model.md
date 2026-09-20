# Threat model

## Protected assets

- Deployment snapshots and fingerprints.
- Verification and source references.
- API keys, webhook secrets, and control-plane credentials.
- Project ownership and claim evidence.
- Event and alert-delivery history.

## Threats and mitigations

| Threat                                  | Mitigation                                                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Malicious or inconsistent RPC response  | Validate owners, account variants, lengths, addresses, and finalized commitment; reconcile repeatedly                                                                    |
| Dropped/replayed WebSocket notification | WebSocket is only a signal; independent polling and database uniqueness provide completeness/idempotency                                                                 |
| Malformed or oversized metadata/IDL     | Bounded fetches, schema normalization, host allowlist, fail-closed parsing, graceful optional-evidence fallback                                                          |
| Metadata URL SSRF                       | HTTPS-only allowlist for program metadata; webhook routes reject literal private/loopback destinations; production egress controls remain required against DNS rebinding |
| Database tampering                      | Canonical cryptographic hashes, append-only snapshot semantics, restricted server credentials, Supabase backups/audit logs                                               |
| API-key leakage                         | High-entropy keys, keyed hashes at rest, prefix-only listing, revocation, rate limiting, no raw-key logs                                                                 |
| Webhook-secret leakage                  | AES-256-GCM at rest, one-time secret display, HMAC timestamped signatures                                                                                                |
| Duplicate/racing workers                | Unique constraints, transactional inserts, `SKIP LOCKED` delivery claiming                                                                                               |
| Fake program claim                      | Claims default to `pending`; only manually verified claims appear publicly                                                                                               |
| AI hallucination or prompt injection    | Structured deterministic input only, untrusted strings treated as data, strict output schema, AI cannot modify facts/severity/status                                     |
| Public Supabase Data API exposure       | RLS enabled and table privileges revoked from `anon` and `authenticated`                                                                                                 |

## Non-goals

UseKratose does not certify a program as safe, guarantee absence of vulnerabilities, decompile arbitrary bytecode, or autonomously modify production code.
