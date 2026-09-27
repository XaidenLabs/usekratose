import { getApiSettingsData } from "@/lib/ui-data";

const endpoints = [
  "POST /v1/programs",
  "GET /v1/programs/:programId",
  "GET /v1/programs/:programId/snapshot",
  "GET /v1/programs/:programId/history",
  "GET /v1/programs/:programId/events",
  "GET /v1/programs/:programId/security",
];

export const dynamic = "force-dynamic";

export default async function ApiPage() {
  const { apiKeys, programs, project } = await getApiSettingsData();
  const createKeyCommand = `curl -X POST /api/v1/projects/${project.id}/api-keys
  -H "Authorization: Bearer $CONTROL_PLANE_TOKEN"
  -H "Content-Type: application/json"
  -d '{"name":"'$API_KEY_NAME'"}'`;
  const requestProgram = programs[0]?.address ?? "$PROGRAM_ID";
  const requestCommand = `curl /api/v1/programs/${requestProgram}/security
  -H "Authorization: Bearer $USEKRATOSE_API_KEY"`;
  return (
    <div className="settings-page dashboard-page">
      <div className="settings-heading">
        <span className="kicker">Versioned public API</span>
        <h1>Consume the same evidence.</h1>
        <p>
          Program state, version history, and security events are available to
          wallets, auditors, explorers, and protocol tooling.
        </p>
      </div>
      <div className="settings-grid">
        <section className="panel">
          <h2>API surface</h2>
          <div className="endpoint-list">
            {endpoints.map((endpoint) => {
              const [method, path] = endpoint.split(" ");
              return (
                <div key={endpoint}>
                  <b>{method}</b>
                  <code>{path}</code>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <h2>Create a scoped key</h2>
          <pre className="command">{createKeyCommand}</pre>
          <p>
            Raw keys are shown once, stored only as keyed hashes,
            project-scoped, revocable, rate-limited, and request-logged.
          </p>
          <h3>Current keys</h3>
          {apiKeys.length === 0 ? (
            <div className="empty">
              <strong>No API keys created.</strong>
            </div>
          ) : (
            <div className="endpoint-list">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id}>
                  <b>{apiKey.revokedAt === null ? "ACTIVE" : "REVOKED"}</b>
                  <code>{apiKey.keyPrefix}…</code>
                  <span>{apiKey.name}</span>
                </div>
              ))}
            </div>
          )}
          <h3>Example request</h3>
          <pre className="command">{requestCommand}</pre>
        </section>
      </div>
    </div>
  );
}
