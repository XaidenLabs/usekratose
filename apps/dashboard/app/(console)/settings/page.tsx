import { Database, Globe2, RadioTower, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getDashboardData } from "@/lib/backend";

export default async function SettingsPage() {
  const data = await getDashboardData();
  return (
    <div className="page-stack">
      <PageHeader description="Workspace identity and connected platform services." eyebrow="Configuration" title="Settings" />
      <section className="settings-columns">
        <article className="surface form-surface"><div className="surface-header compact-header"><div><h2>Workspace</h2><p>Organization boundary for programs and API access.</p></div></div><label>Workspace name<input readOnly value={data.workspace.name} /></label><label>Workspace ID<input readOnly value={data.workspace.id} /></label><p className="field-help">Workspace changes require the control-plane API.</p></article>
        <article className="surface connection-card"><div className="surface-header compact-header"><div><h2>Connected services</h2><p>Runtime dependencies reported by this console.</p></div></div><div><span><Database size={16} />Supabase database</span><StatusBadge tone="good">Connected</StatusBadge></div><div><span><ShieldCheck size={16} />Supabase authentication</span><StatusBadge tone="good">Connected</StatusBadge></div><div><span><RadioTower size={16} />Monitoring worker</span><StatusBadge tone={data.programs.every((item) => item.program.monitoringStatus === "healthy") ? "good" : "warning"}>{data.programs.every((item) => item.program.monitoringStatus === "healthy") ? "Healthy" : "Review"}</StatusBadge></div><div><span><Globe2 size={16} />Public evidence API</span><StatusBadge tone="good">Available</StatusBadge></div></article>
      </section>
    </div>
  );
}
