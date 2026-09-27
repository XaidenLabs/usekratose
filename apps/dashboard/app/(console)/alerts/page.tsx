import { BellRing, Webhook } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getDashboardData } from "@/lib/backend";

export default async function AlertsPage() {
  const data = await getDashboardData();
  return (
    <div className="page-stack">
      <PageHeader description="Signed delivery channels for deterministic security events." eyebrow="Incident delivery" title="Alerts" />
      <section className="surface">
        <div className="surface-header"><div><h2>Destinations</h2><p>Webhook secrets remain encrypted at rest.</p></div></div>
        {data.alertDestinations.length === 0 ? <div className="empty-state"><BellRing size={30} /><strong>No destinations configured</strong><p>Use the control API to register a signed webhook destination.</p></div> : (
          <div className="resource-list">{data.alertDestinations.map((destination) => <article key={destination.id}><span className="resource-icon"><Webhook size={17} /></span><div><b>{destination.destination}</b><small>{destination.type} · minimum {destination.minSeverity}</small></div><StatusBadge tone={destination.enabled ? "good" : "neutral"}>{destination.enabled ? "Active" : "Disabled"}</StatusBadge></article>)}</div>
        )}
      </section>
    </div>
  );
}
