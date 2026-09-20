import Link from "next/link";

const endpoints = [
  "POST /v1/programs",
  "GET /v1/programs/:programId",
  "GET /v1/programs/:programId/snapshot",
  "GET /v1/programs/:programId/history",
  "GET /v1/programs/:programId/events",
  "GET /v1/programs/:programId/security",
];
const createKeyCommand = `curl -X POST /api/v1/projects/demo/api-keys
  -H "Authorization: Bearer $CONTROL_PLANE_TOKEN"
  -H "Content-Type: application/json"
  -d '{"name":"Protocol CI"}'`;
const requestCommand = `curl /api/v1/programs/$PROGRAM/security
  -H "Authorization: Bearer $USEKRATOSE_API_KEY"`;

export default function ApiPage() {
  return (
    <div className="settings-page shell">
      <div className="settings-nav">
        <Link href="/dashboard">← Console</Link>
        <span>Developer infrastructure</span>
      </div>
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
          <h3>Example request</h3>
          <pre className="command">{requestCommand}</pre>
        </section>
      </div>
    </div>
  );
}
