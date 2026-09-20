# Security event rules

Milestone 2 is deterministic. Every event is reproduced from two stored snapshots using rule-engine version `2`. No AI output, probability, label, or numerical score can create or alter an event.

## Event model

One snapshot transition may create several events. Each event has one type, one severity, both snapshot IDs, structured evidence, and a detection timestamp. PostgreSQL enforces uniqueness on `(previous_snapshot_id, current_snapshot_id, type)`, so replaying the same transition cannot create duplicate events while a legitimate combined upgrade can create multiple event types.

## Rules

| Condition                                                                                                | Event                      | Severity   | Evidence                                                                                      |
| -------------------------------------------------------------------------------------------------------- | -------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| Executable hash changed                                                                                  | `PROGRAM_UPGRADED`         | `high`     | Old/new executable hashes, slots, ProgramData addresses, and change flags                     |
| ProgramData address changed                                                                              | `PROGRAM_UPGRADED`         | `high`     | Old/new ProgramData addresses and deployment evidence                                         |
| Deployment slot changed without executable or ProgramData change                                         | `PROGRAM_UPGRADED`         | `info`     | Old/new slots with `executableChanged: false`                                                 |
| Upgrade authority changed to another address                                                             | `AUTHORITY_CHANGED`        | `high`     | Old/new authority and `becameImmutable: false`                                                |
| Upgrade authority changed to null                                                                        | `PROGRAM_BECAME_IMMUTABLE` | `info`     | Old authority, null current authority, and `becameImmutable: true`                            |
| Program account owner changed                                                                            | `OWNER_CHANGED`            | `critical` | Old/new owner addresses                                                                       |
| Program executable state changed                                                                         | `PROGRAM_UPGRADED`         | `high`     | Old/new executable booleans and preserved deployment evidence                                 |
| Normalized IDL hash changed                                                                              | `IDL_CHANGED`              | `medium`   | Old/new hashes plus instruction schemas, account types, and error-definition changes          |
| IDL instruction added                                                                                    | `INSTRUCTION_ADDED`        | `medium`   | Sorted names plus normalized signer, writable-account, and argument evidence                  |
| Privileged-looking instruction added                                                                     | `INSTRUCTION_ADDED`        | `high`     | Added definitions and names matching the explicit privileged token rule                       |
| IDL instruction removed                                                                                  | `INSTRUCTION_REMOVED`      | `medium`   | Sorted removed names and previous normalized definitions                                      |
| Existing instruction schema changed without signer/writable escalation                                   | `INSTRUCTION_CHANGED`      | `medium`   | Account, optional, argument, signer, and writable deltas                                      |
| Existing instruction signer changed or an account became writable                                        | `INSTRUCTION_CHANGED`      | `high`     | Exact normalized requirement deltas and escalation flags                                      |
| A previously trusted fingerprint no longer matches and the current snapshot is not independently trusted | `VERIFICATION_STALE`       | `high`     | Previous trusted fingerprint, current fingerprint, and metadata/source-reference change flags |

## Privileged-looking instruction rule

An added instruction is elevated from `medium` to `high` when its name contains one of these case-insensitive tokens:

`admin`, `authority`, `upgrade`, `owner`, `pause`, `freeze`, `mint`, `withdraw`, `emergency`, `privilege`.

This is an explainable prioritization rule, not vulnerability detection. The exact matching names are stored in event evidence.

## Optional evidence

IDL instructions are compared only when both snapshots contain an instruction list. This prevents temporary IDL unavailability from being reported as instruction removal. IDL, metadata, and source-reference inputs are canonicalized or hashed before entering the snapshot fingerprint. If fresh enrichment is unavailable during an RPC reconciliation, the previous optional evidence is carried forward rather than erased.

Signer, writable-account, optional-account, and argument changes produce `INSTRUCTION_CHANGED` alongside `IDL_CHANGED`. Signer changes and newly writable accounts are high; other schema changes are medium. Account-type and error-definition changes remain structured evidence on `IDL_CHANGED`.

Metadata and source-reference changes are always represented in `SnapshotDiff`. They generate `VERIFICATION_STALE` when they invalidate a previously trusted state; no unsupported metadata-specific event type is invented.

## Owner-change handling

Initial ingestion remains loader-v3-only. During monitoring, if the program account owner no longer matches the stored owner, UseKratose preserves the previous executable facts, records the newly observed owner and context slot, and emits `OWNER_CHANGED` as critical. It does not attempt to parse the new owner account as loader-v3 data.

## Deduplication

Workers may receive the same WebSocket notification repeatedly or race with polling. Snapshot uniqueness remains `(program_id, fingerprint)`. Event uniqueness is `(previous_snapshot_id, current_snapshot_id, type)`. Both the snapshot and all events are inserted in one database transaction.

When ProgramData changes, the canonical `programs.programdata_address` pointer is updated in that same transaction. The worker portfolio refresh then subscribes to the new account while polling remains the completeness path during the subscription handoff.
