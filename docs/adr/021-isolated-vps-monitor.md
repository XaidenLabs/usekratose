# ADR 021: Isolate the persistent monitor on the shared VPS

## Status

Accepted.

## Context

Vercel is appropriate for the landing page, dashboard, and request-driven API routes, but it cannot guarantee a continuously running WebSocket and reconciliation process. The available VPS already hosts a client application and Ollama, so the monitoring worker must not share the client's runtime or process manager.

The VPS audit also found a modified npm CLI that spawned obfuscated root-owned Node processes. The payload processes were stopped, the compromised file was preserved, the signed package was reinstalled, package integrity was rechecked, and the client remained healthy. This remediation does not replace a future clean rebuild and credential rotation.

## Decision

Run the monitor as a dedicated `systemd` service with:

- a non-login `usekratose` user;
- an isolated Node 22 runtime under `/opt/usekratose-monitor/runtime`;
- immutable timestamped releases and an atomic `current` symlink;
- secrets in a root-owned environment file outside release artifacts;
- automatic restart and graceful `SIGTERM` shutdown;
- strict filesystem, privilege, task, CPU, and memory limits;
- no public listening port; and
- Supabase as the durable state and coordination layer.

The existing client application remains under PM2 and keeps its existing port and runtime.

## Consequences

The monitor can run continuously without consuming a Vercel function invocation or changing the client deployment. Releases are independently reversible, and a runaway monitor cannot consume all VPS memory or CPU. Operations now include checking both the worker and client health during every deployment.

Because the host was remediated in place, all credentials that existed before remediation must be rotated. A clean VPS rebuild remains the long-term security requirement.
