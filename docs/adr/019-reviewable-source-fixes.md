# ADR 019: Reviewable source evidence and fixes

## Status

Accepted

## Context

On-chain Solana deployments provide executable bytes and loader metadata, but
they do not provide trustworthy source code. A `.so` file cannot be converted
back into the original Rust source, and executing user-supplied build artifacts
inside the web application would create an unacceptable remote-code-execution
boundary.

UseKratose still needs enough source context to explain deterministic deployment
changes and propose reviewable remediations.

## Decision

UseKratose accepts source evidence through either a private Supabase Storage
upload or a user-installed GitHub App. An uploaded IDL is normalized and hashed.
An uploaded `.so` file is hashed and compared with the observed executable hash;
it is never executed or decompiled.

AI analysis receives bounded source files, normalized IDL evidence, version
snapshots, and deterministic security events. Proposed fixes must reference an
existing file and include an exact `before` fragment. Suggestions that cannot
be grounded uniquely in the supplied source are discarded.

Every finding remains pending until the user chooses **Autofix** or **Reject**.
For uploaded source, Autofix replaces only the exact reviewed fragment in the
private object. For GitHub source, Autofix creates a dedicated branch, commits
the exact reviewed replacements, and opens a pull request. It never writes to
the default branch, builds a program, signs a transaction, or deploys an
upgrade.

## Consequences

- Source intelligence degrades gracefully when source or IDL is unavailable.
- Binary-to-source claims are explicitly prohibited.
- Fixes are auditable, reversible, and separated from deployment authority.
- GitHub installations require `Contents: Read and write`, `Pull requests: Read
and write`, and `Metadata: Read` permissions.
- Uploaded artifacts remain private and are accessible only through an
  authenticated, project-owned API path.
