# Core product flow

The Audit AI walkthrough is used only as a product-flow reference. UseKratose does not copy its implementation, visual identity, EVM analysis, risk scoring, or AI remediation behavior.

## Public landing

The landing page explains:

- what continuous Solana deployment security means;
- how ProgramData resolution, finalized fingerprints, reconciliation, and deterministic diffs work;
- which evidence is always available and which intelligence is optional;
- one primary action: monitor a Solana program.

## Authentication and project

A user signs in or creates an account, then enters an organization-owned project. Authentication controls access to project configuration; it does not control public Solana evidence.

## Security console

The dashboard replaces generic audit totals with factual operational metrics:

- programs monitored;
- deployment transitions detected;
- authority changes detected;
- programs requiring review;
- reconciliation health.

UseKratose does not display an arbitrary score out of 100.

## Add program

The user selects a cluster and enters a Solana program address. UseKratose validates the address, verifies loader-v3 ownership, resolves ProgramData, extracts the upgrade authority, hashes the executable, and stores the initial baseline.

The user does not upload bytecode or manually enter a detected change.

## Program profile

The project detail from the reference flow becomes a monitored-program profile containing:

- current executable fingerprint;
- deployment and observed slots;
- ProgramData address;
- owner and executable state;
- upgrade authority or immutable status;
- chronological version history;
- reconciliation health;
- deterministic security events.

## Security event report

The audit report becomes a snapshot-pair report containing:

- previous and current deployment evidence;
- exact changed fields;
- rule-generated event type and severity;
- structured evidence suitable for JSON export;
- verification state and stale-trust evidence.

Reports must never claim that a program is safe merely because no transition was detected.

## History and rerun behavior

Audit history becomes immutable deployment history. “Rerun audit” becomes “reconcile now,” which performs finalized reads and creates no new snapshot when the fingerprint is unchanged.

Removing a program from a project means stopping future monitoring. Historical evidence must not be deleted by default.

## Deferred

The following reference features remain outside the core release gate:

- AI vulnerability discovery;
- automatic code fixes or patches;
- gas optimization;
- numerical risk scores;
- PDF and Markdown exports;
- billing and subscriptions;
- arbitrary source-code upload and decompilation.

Optional AI may later explain deterministic evidence, but it cannot create or modify facts, event types, or severity.
