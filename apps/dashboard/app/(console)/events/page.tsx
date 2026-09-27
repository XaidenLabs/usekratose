import { Activity } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getDashboardData } from "@/lib/backend";
import { formatDate, shortAddress, titleCase } from "@/lib/format";

export default async function EventsPage() {
  const data = await getDashboardData();
  return (
    <div className="page-stack">
      <PageHeader description="Rule-based findings produced from consecutive stored snapshots." eyebrow="Evidence ledger" title="Security events" />
      <section className="surface">
        <div className="surface-header"><div><h2>Detected transitions</h2><p>Events are immutable and deduplicated by snapshot pair.</p></div></div>
        {data.recentEvents.length === 0 ? <div className="empty-state"><Activity size={30} /><strong>No events recorded</strong></div> : (
          <div className="event-ledger">
            {data.recentEvents.map(({ event, program }) => (
              <article key={event.id}>
                <span className={`event-icon ${event.severity}`}><Activity size={16} /></span>
                <div><div className="event-title"><b>{titleCase(event.type)}</b><StatusBadge tone={event.severity === "critical" ? "danger" : event.severity === "high" ? "warning" : "neutral"}>{event.severity}</StatusBadge></div><p>{shortAddress(program.address, 10, 7)} · {program.cluster}</p><small>{formatDate(event.detectedAt)}</small></div>
                <code>{shortAddress(event.id, 8, 6)}</code>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
