import { Braces, Database, Fingerprint, RadioTower } from "lucide-react";

import { PageHeader } from "@/components/page-header";

const endpoints = [
  { method: "GET", path: "/api/v1/programs", purpose: "List monitored programs" },
  { method: "POST", path: "/api/v1/programs", purpose: "Ingest a Solana program" },
  { method: "GET", path: "/api/v1/events", purpose: "Read deterministic security events" },
  { method: "GET", path: "/api/v1/programs/:address/snapshots", purpose: "Read deployment history" },
] as const;

export default function DocsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_USEKRATOSE_API_URL ?? "http://localhost:3000";
  return (
    <div className="page-stack">
      <PageHeader description="Connect automation to the same evidence engine used by this console." eyebrow="Developer platform" title="API documentation" />
      <section className="metric-cards">
        <article><span><Fingerprint size={14} />Authentication</span><strong className="metric-text">Bearer API key</strong><small>Use a project-scoped usk_ key</small></article>
        <article><span><Database size={14} />Response format</span><strong className="metric-text">JSON</strong><small>Strict, versioned contracts</small></article>
        <article><span><RadioTower size={14} />Network</span><strong className="metric-text">Solana RPC</strong><small>Devnet and mainnet-beta</small></article>
        <article><span><Braces size={14} />Base URL</span><strong className="metric-text">{apiUrl}</strong><small>Configure per environment</small></article>
      </section>
      <section className="surface">
        <div className="surface-header"><div><h2>Core endpoints</h2><p>Program monitoring, snapshots, and event evidence.</p></div></div>
        <div className="resource-list">
          {endpoints.map((endpoint) => (
            <article key={`${endpoint.method}:${endpoint.path}`}>
              <span className="resource-icon"><Braces size={16} /></span>
              <span><b><code>{endpoint.method}</code> {endpoint.path}</b><small>{endpoint.purpose}</small></span>
              <code>{apiUrl}</code>
            </article>
          ))}
        </div>
      </section>
      <section className="surface form-surface">
        <div className="surface-header compact-header"><div><h2>Example request</h2><p>Never expose the full API key in client-side code.</p></div></div>
        <pre className="code-sample"><code>{`curl ${apiUrl}/api/v1/programs \\\n  -H "Authorization: Bearer usk_your_project_key"`}</code></pre>
      </section>
    </div>
  );
}
