import { formatProgramDiffReport } from "@usekratose/core";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicProgram } from "@/lib/ui-data";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; programId: string }>;
}) {
  const { eventId, programId } = await params;
  const result = await getPublicProgram(programId);
  if (result === null) notFound();
  const event = result.events.find((item) => item.id === eventId);
  if (event === undefined) notFound();
  const current = result.snapshots.find(
    (item) => item.id === event.currentSnapshotId,
  );
  const previous = result.snapshots.find(
    (item) => item.id === event.previousSnapshotId,
  );
  if (current === undefined || previous === undefined) notFound();
  const related = result.events.filter(
    (item) =>
      item.currentSnapshotId === current.id &&
      item.previousSnapshotId === previous.id,
  );
  const explanation = result.explanations.find(
    (item) => item.eventId === event.id,
  );

  return (
    <div className="detail shell">
      <Link className="back-link" href={`/program/${result.program.address}`}>
        ← Back to security profile
      </Link>
      <div className="detail-heading">
        <div>
          <span className={`severity ${event.severity}`}>{event.severity}</span>
          <h1>{event.type.replaceAll("_", " ")}</h1>
          <p>
            Deterministic evidence from snapshot{" "}
            <code>{previous.id.slice(0, 8)}</code> to{" "}
            <code>{current.id.slice(0, 8)}</code>.
          </p>
        </div>
        <time>{event.detectedAt.toLocaleString()}</time>
      </div>
      <div className="detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Exact program diff</h2>
              <p>Generated from stored snapshots.</p>
            </div>
          </div>
          <pre className="diff-report">
            {formatProgramDiffReport({ current, events: related, previous })}
          </pre>
        </section>
        <aside>
          <section className="panel explanation-card">
            <span className="kicker">Evidence-guided explanation</span>
            {explanation === undefined ? (
              <>
                <h2>Explanation pending</h2>
                <p>
                  The deterministic event remains authoritative. AI explanation
                  is optional and only generated when a provider is configured.
                </p>
              </>
            ) : (
              <>
                <h2>{explanation.explanation.summary}</h2>
                <p>{explanation.explanation.possibleImpact}</p>
                <h3>Review areas</h3>
                <ul>
                  {explanation.explanation.reviewAreas.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <small>{explanation.explanation.caveat}</small>
              </>
            )}
          </section>
          <section className="panel raw-evidence">
            <h2>Structured evidence</h2>
            <pre>{JSON.stringify(event.evidence, null, 2)}</pre>
          </section>
        </aside>
      </div>
    </div>
  );
}
