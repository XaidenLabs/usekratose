import type { Metadata } from "next";
import Link from "next/link";

import { getDashboardData } from "@/lib/ui-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Security Console" };

export default async function DashboardPage() {
  const { metrics, programs } = await getDashboardData();
  return (
      <section className="workspace dashboard-page">
        <div className="workspace-heading">
          <div>
            <span className="kicker">Continuous verification</span>
            <h1>Security console</h1>
            <p>Current evidence across every monitored deployment.</p>
          </div>
          <Link className="button" href="/dashboard/monitor">
            + Add program
          </Link>
        </div>
        <div className="metric-grid">
          <article>
            <span>Programs monitored</span>
            <strong>{programs.length}</strong>
            <small>Project portfolio</small>
          </article>
          <article>
            <span>Upgrades detected</span>
            <strong>{metrics.upgrades_detected ?? 0}</strong>
            <small>Recorded transitions</small>
          </article>
          <article>
            <span>Alerts delivered</span>
            <strong>{metrics.alerts_delivered ?? 0}</strong>
            <small>Signed notifications</small>
          </article>
          <article>
            <span>Profile views</span>
            <strong>{metrics.public_profile_views ?? 0}</strong>
            <small>Objective public evidence</small>
          </article>
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Monitored programs</h2>
              <p>Latest monitoring state from the reconciliation worker.</p>
            </div>
            <span>{programs.length} total</span>
          </div>
          {programs.length === 0 ? (
            <div className="empty">
              <strong>No programs in this project yet.</strong>
              <p>
                Add a devnet or mainnet program to establish its first
                deployment baseline.
              </p>
              <Link className="button button-small" href="/dashboard/monitor">
                Monitor your first program
              </Link>
            </div>
          ) : (
            <div className="program-table">
              <div className="table-row table-head">
                <span>Program</span>
                <span>Network</span>
                <span>ProgramData</span>
                <span>Status</span>
                <span />
              </div>
              {programs.map((program) => (
                <div className="table-row" key={program.id}>
                  <span>
                    <b>
                      {program.address.slice(0, 8)}…{program.address.slice(-6)}
                    </b>
                    <small>{program.id}</small>
                  </span>
                  <span className="caps">{program.cluster}</span>
                  <code>
                    {program.programDataAddress.slice(0, 8)}…
                    {program.programDataAddress.slice(-6)}
                  </code>
                  <span className={`status ${program.monitoringStatus}`}>
                    {program.monitoringStatus}
                  </span>
                  <Link href={`/program/${program.address}`}>View →</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
  );
}
