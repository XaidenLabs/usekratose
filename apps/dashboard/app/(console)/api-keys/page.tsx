import { KeyRound } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getDashboardData } from "@/lib/backend";

export default async function ApiKeysPage() {
  const data = await getDashboardData();
  return (
    <div className="page-stack">
      <PageHeader description="Project-scoped credentials for wallets, explorers, and protocol tooling." eyebrow="Developer access" title="API keys" />
      <section className="surface">
        <div className="surface-header"><div><h2>Credentials</h2><p>Raw keys are shown only once and stored as keyed hashes.</p></div></div>
        {data.apiKeys.length === 0 ? <div className="empty-state"><KeyRound size={30} /><strong>No API keys created</strong><p>Create keys through the versioned control API.</p></div> : (
          <div className="resource-list">{data.apiKeys.map((key) => <article key={key.id}><span className="resource-icon"><KeyRound size={17} /></span><div><b>{key.name}</b><code>{key.keyPrefix}••••••••••••</code></div><StatusBadge tone={key.revokedAt === null ? "good" : "neutral"}>{key.revokedAt === null ? "Active" : "Revoked"}</StatusBadge></article>)}</div>
        )}
      </section>
    </div>
  );
}
