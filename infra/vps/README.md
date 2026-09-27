# Persistent monitor deployment

The persistent monitor runs independently from the public web applications. Vercel hosts request-driven web traffic; a dedicated `systemd` service performs WebSocket monitoring and reconciliation polling.

## Server layout

- Releases: `/opt/usekratose-monitor/releases/<UTC timestamp>`
- Active release: `/opt/usekratose-monitor/current`
- Isolated Node runtime: `/opt/usekratose-monitor/runtime/node-current`
- Environment: `/etc/usekratose-monitor/monitor.env`
- Writable state: `/var/lib/usekratose-monitor`
- Service: `usekratose-monitor.service`

The service runs as the non-login `usekratose` account. It does not share the client application's PM2 process, Node runtime, working directory, or environment.

## Operations

```bash
systemctl status usekratose-monitor
journalctl -u usekratose-monitor -f
systemctl restart usekratose-monitor
```

To roll back, repoint `/opt/usekratose-monitor/current` to the previous release and restart the service. Never place secrets inside a release directory.

## Release verification

Every release must pass these checks:

1. Build and smoke-test `apps/monitor/dist/main.js` locally.
2. Verify the service reaches `active (running)` with zero restarts.
3. Confirm the WebSocket provider reaches `connected`.
4. Confirm `programs.last_reconciled_at` advances in Supabase.
5. Confirm the colocated client application's health check remains successful.

## Host safety

Before deployment, verify package integrity and inspect unexpected root-owned processes. If host compromise is suspected, preserve evidence, rotate exposed credentials, and prefer rebuilding the server from a trusted image. In-place remediation reduces immediate risk but cannot provide the same assurance as a clean rebuild.
