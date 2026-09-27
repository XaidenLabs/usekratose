import Link from "next/link";
import { Activity, BellRing, Eye, ShieldCheck } from "lucide-react";

import { AddProgramButton } from "@/components/add-program-button";
import { PageHeader } from "@/components/page-header";
import { ProgramInspector } from "@/components/program-inspector";
import { StatusBadge } from "@/components/status-badge";
import { getDashboardData } from "@/lib/backend";
import { formatDate, shortAddress, titleCase } from "@/lib/format";

export default async function OverviewPage() {
  const data = await getDashboardData();
  const healthy = data.programs.filter(
    (entry) => entry.program.monitoringStatus === "healthy",
  ).length;
  const highEvents = data.recentEvents.filter(
    (entry) =>
      entry.event.severity === "high" || entry.event.severity === "critical",
  ).length;
  return (
    <div className="page-stack">
      <PageHeader
        actions={<AddProgramButton />}
        description="Live evidence across every Solana deployment in this workspace."
        eyebrow="Continuous verification"
        title={`Good day, ${data.profile.displayName.split(" ")[0]}`}
      />
      <section className="metric-cards">
        <article>
          <span>
            <ShieldCheck size={16} />
            Programs monitored
          </span>
          <strong>{data.programs.length}</strong>
          <small>{healthy} currently healthy</small>
        </article>
        <article>
          <span>
            <Activity size={16} />
            Security events
          </span>
          <strong>{data.recentEvents.length}</strong>
          <small>{highEvents} high-priority changes</small>
        </article>
        <article>
          <span>
            <BellRing size={16} />
            Alert destinations
          </span>
          <strong>{data.alertDestinations.length}</strong>
          <small>
            {data.alertDestinations.filter((item) => item.enabled).length}{" "}
            active
          </small>
        </article>
        <article>
          <span>
            <Eye size={16} />
            Public profile views
          </span>
          <strong>{data.metrics.public_profile_views ?? 0}</strong>
          <small>Evidence consumers</small>
        </article>
      </section>
      <section className="dashboard-grid">
        <article className="surface span-two program-management-surface">
          <div className="surface-header">
            <div>
              <h2>Monitored programs</h2>
              <p>Latest finalized deployment state.</p>
            </div>
            <Link href="/programs">View all</Link>
          </div>
          {data.programs.length === 0 ? (
            <div className="empty-state">
              <ShieldCheck size={28} />
              <strong>No programs monitored</strong>
              <p>Add a Solana program to establish its first baseline.</p>
            </div>
          ) : (
            <div className="data-table monitored-programs">
              <div className="data-row data-head">
                <span>Program</span>
                <span>Network</span>
                <span>Deployment</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {data.programs.slice(0, 5).map((entry) => (
                <div className="data-row" key={entry.program.id}>
                  <span>
                    <b>{entry.displayName}</b>
                    <small>{shortAddress(entry.program.address)}</small>
                  </span>
                  <span className="caps">{entry.program.cluster}</span>
                  <span>
                    <b>
                      {String(entry.currentSnapshot?.deploymentSlot ?? "—")}
                    </b>
                    <small>{entry.versionCount} stored versions</small>
                  </span>
                  <span>
                    <StatusBadge
                      tone={
                        entry.program.monitoringStatus === "healthy"
                          ? "good"
                          : "warning"
                      }
                    >
                      {entry.program.monitoringStatus}
                    </StatusBadge>
                  </span>
                  <ProgramInspector entry={entry} />
                </div>
              ))}
            </div>
          )}
        </article>
        <article className="surface">
          <div className="surface-header">
            <div>
              <h2>Recent activity</h2>
              <p>Latest deterministic events.</p>
            </div>
          </div>
          <div className="activity-list">
            {data.recentEvents.length === 0 ? (
              <div className="empty-state compact">
                <Activity size={24} />
                <strong>No changes detected</strong>
              </div>
            ) : (
              data.recentEvents.slice(0, 5).map(({ event, program }) => (
                <div className="activity-item" key={event.id}>
                  <span className={`activity-dot ${event.severity}`} />
                  <div>
                    <b>{titleCase(event.type)}</b>
                    <small>
                      {shortAddress(program.address)} ·{" "}
                      {formatDate(event.detectedAt)}
                    </small>
                  </div>
                  <StatusBadge
                    tone={
                      event.severity === "critical"
                        ? "danger"
                        : event.severity === "high"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {event.severity}
                  </StatusBadge>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
