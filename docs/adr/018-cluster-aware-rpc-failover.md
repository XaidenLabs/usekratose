# ADR 018: Use cluster-aware RPC failover

## Status

Accepted.

## Context

UseKratose depends on finalized RPC reads for security evidence. A provider outage must not stop reconciliation, but a fallback must never silently query a different Solana cluster. Solami's configured RPC endpoint is mainnet-beta, while the existing demonstration worker currently monitors devnet.

## Decision

- Use Solami as the first HTTP RPC provider for mainnet-beta whenever `SOLAMI_API_KEY` is configured.
- Keep a separately configured mainnet endpoint as the second provider and use it only after a Solami request fails.
- Keep devnet on devnet-specific providers; never fall through from devnet to Solami mainnet.
- Validate each provider response through the same strict `SolanaRpcClient` schema before it enters ingestion or reconciliation.
- Log provider names, latency, and failure state without logging endpoint URLs or API keys.
- Keep WebSocket notifications non-authoritative. A Solami WebSocket endpoint is enabled only when explicitly configured and rotates to the existing provider after disconnects. Finalized polling remains the completeness mechanism.

## Consequences

- Mainnet ingestion and reconciliation use Solami for real product work rather than a demonstration-only request.
- An HTTP provider outage increases latency but does not change fingerprint semantics or evidence correctness.
- A successful null account response does not trigger cross-provider retries because it is valid finalized chain state.
- Cluster configuration remains an explicit safety boundary.
