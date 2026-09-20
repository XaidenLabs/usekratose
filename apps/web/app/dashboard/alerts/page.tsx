import Link from "next/link";

const webhookCommand = `curl -X POST /api/v1/projects/demo/alerts
  -H "Authorization: Bearer $CONTROL_PLANE_TOKEN"
  -H "Content-Type: application/json"
  -d '{"type":"webhook","destination":"https://example.com/hook","minSeverity":"high"}'`;

export default function AlertsPage() {
  return (
    <div className="settings-page shell">
      <div className="settings-nav">
        <Link href="/dashboard">← Console</Link>
        <span>Configuration</span>
      </div>
      <div className="settings-heading">
        <span className="kicker">Signed delivery</span>
        <h1>Alert destinations</h1>
        <p>
          Deliver deterministic security events to your incident and engineering
          workflows.
        </p>
      </div>
      <div className="settings-grid">
        <section className="panel">
          <h2>Webhook contract</h2>
          <p>
            Every payload includes the event, severity, program, snapshot pair,
            and structured evidence.
          </p>
          <div className="code-card">
            <code>x-usekratose-signature: t=…,v1=…</code>
            <code>x-usekratose-event: PROGRAM_UPGRADED</code>
            <code>x-usekratose-delivery: &lt;uuid&gt;</code>
          </div>
          <h3>Reliability</h3>
          <ul className="check-list">
            <li>Encrypted signing secrets</li>
            <li>Bounded exponential retries</li>
            <li>Persistent delivery status</li>
            <li>Snapshot-pair deduplication</li>
          </ul>
        </section>
        <section className="panel">
          <h2>Create through the control API</h2>
          <p>
            Alert administration requires the server-side control-plane token.
          </p>
          <pre className="command">{webhookCommand}</pre>
          <p className="evidence-note">
            The signing secret is returned once. Store it in your
            receiver&apos;s secret manager.
          </p>
        </section>
      </div>
    </div>
  );
}
