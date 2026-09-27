import type { Metadata } from "next";

export const metadata: Metadata = { title: "Documentation" };

const monitoringSteps = [
  "Submit a valid upgradeable Solana program address.",
  "Resolve ProgramData and store the finalized deployment baseline.",
  "Watch account changes and reconcile with finalized polling.",
  "Diff consecutive snapshots and persist deterministic events.",
] as const;

export default function DocsPage() {
  return (
    <div className="settings-page dashboard-page">
      <div className="settings-heading">
        <span className="kicker">Product documentation</span>
        <h1>Evidence before interpretation.</h1>
        <p>
          UseKratose monitors deployed Solana state and records reproducible
          evidence for every observed transition.
        </p>
      </div>
      <div className="settings-grid">
        <section className="panel docs-panel">
          <h2>Monitoring lifecycle</h2>
          <ol className="docs-list">
            {monitoringSteps.map((step, index) => (
              <li key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {step}
              </li>
            ))}
          </ol>
        </section>
        <section className="panel docs-panel">
          <h2>Deterministic evidence</h2>
          <p>
            Executable hashes, deployment slots, owners, ProgramData accounts,
            upgrade authorities, IDLs, and source references are compared by
            explicit rules. AI explanations never create or modify events.
          </p>
          <div className="evidence-note">
            Public profiles report observed facts. They are not safety
            certifications or endorsements.
          </div>
        </section>
      </div>
    </div>
  );
}
