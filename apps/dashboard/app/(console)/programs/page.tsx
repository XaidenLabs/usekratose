import { ShieldCheck } from "lucide-react";

import { AddProgramButton } from "@/components/add-program-button";
import { PageHeader } from "@/components/page-header";
import { ProgramInspector } from "@/components/program-inspector";
import { StatusBadge } from "@/components/status-badge";
import { getDashboardData } from "@/lib/backend";
import { shortAddress } from "@/lib/format";

export default async function ProgramsPage() {
  const data = await getDashboardData();
  return (
    <div className="page-stack">
      <PageHeader
        actions={<AddProgramButton />}
        description="Deployment fingerprints, ProgramData accounts, and monitoring health."
        eyebrow="Portfolio"
        title="Programs"
      />
      <section className="surface program-management-surface">
        <div className="surface-header">
          <div>
            <h2>Program inventory</h2>
            <p>
              {data.programs.length} programs attached to {data.workspace.name}.
            </p>
          </div>
        </div>
        {data.programs.length === 0 ? (
          <div className="empty-state">
            <ShieldCheck size={30} />
            <strong>No programs yet</strong>
            <p>Add your first program to begin continuous monitoring.</p>
          </div>
        ) : (
          <div className="data-table program-inventory">
            <div className="data-row data-head">
              <span>Program</span>
              <span>Network</span>
              <span>Fingerprint</span>
              <span>Authority</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {data.programs.map((entry) => (
              <div className="data-row" key={entry.program.id}>
                <span>
                  <b>{entry.displayName}</b>
                  <small>{shortAddress(entry.program.address, 9, 7)}</small>
                </span>
                <span className="caps">{entry.program.cluster}</span>
                <code>
                  {shortAddress(
                    String(
                      entry.currentSnapshot?.executableHash ?? "Unavailable",
                    ),
                    15,
                    8,
                  )}
                </code>
                <code>
                  {shortAddress(
                    String(
                      entry.currentSnapshot?.upgradeAuthority ?? "Immutable",
                    ),
                    10,
                    6,
                  )}
                </code>
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
      </section>
    </div>
  );
}
