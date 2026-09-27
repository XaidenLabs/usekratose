import { getAlertSettingsData } from "@/lib/ui-data";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const { destinations, project } = await getAlertSettingsData();
  const webhookCommand = `curl -X POST /api/v1/projects/${project.id}/alerts
  -H "Authorization: Bearer $CONTROL_PLANE_TOKEN"
  -H "Content-Type: application/json"
  -d '{"type":"webhook","destination":"'$WEBHOOK_URL'","minSeverity":"'$MIN_SEVERITY'"}'`;
  return (
    <div className="settings-page dashboard-page">
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
          <h2>Configured destinations</h2>
          <p>
            Live destinations stored for <strong>{project.name}</strong>.
          </p>
          {destinations.length === 0 ? (
            <div className="empty">
              <strong>No alert destinations configured.</strong>
              <p>Create one through the control API.</p>
            </div>
          ) : (
            <div className="endpoint-list">
              {destinations.map((destination) => (
                <div key={destination.id}>
                  <b>{destination.enabled ? "ACTIVE" : "DISABLED"}</b>
                  <code>{destination.destination}</code>
                  <span>minimum {destination.minSeverity}</span>
                </div>
              ))}
            </div>
          )}
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
          <p>
            Set <code>WEBHOOK_URL</code> and <code>MIN_SEVERITY</code> from your
            deployment environment before running the command.
          </p>
          <p className="evidence-note">
            The signing secret is returned once. Store it in your
            receiver&apos;s secret manager.
          </p>
        </section>
      </div>
    </div>
  );
}
