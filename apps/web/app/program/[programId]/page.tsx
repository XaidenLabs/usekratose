import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deriveProgramSecurityStatus } from "@usekratose/core";

import { getPublicProgram } from "@/lib/ui-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ programId: string }>;
}): Promise<Metadata> {
  const { programId } = await params;
  return { title: `Program ${programId.slice(0, 8)}…` };
}

function short(value: string | null, front = 10, back = 8) {
  if (value === null) return "Unavailable";
  return value.length > front + back
    ? `${value.slice(0, front)}…${value.slice(-back)}`
    : value;
}

export default async function ProgramProfilePage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const result = await getPublicProgram(programId);
  if (result === null) notFound();
  const [current] = result.snapshots;
  const status = deriveProgramSecurityStatus({
    hasPriorSnapshot: result.snapshots.length > 1,
    snapshot: current ?? null,
  });
  const explanationByEvent = new Map(
    result.explanations.map((item) => [item.eventId, item]),
  );

  return (
    <div className="profile shell">
      <div className="profile-hero">
        <div>
          <div className="eyebrow">
            <span className={`status-dot ${status}`} /> Public security profile
          </div>
          <h1>{short(result.program.address, 12, 10)}</h1>
          <p className="address-line">
            <code>{result.program.address}</code>
            <span>{result.program.cluster}</span>
            {result.claim === null ? (
              <b>Unclaimed</b>
            ) : (
              <b className="verified">Claim verified</b>
            )}
          </p>
        </div>
        <div className={`security-state ${status}`}>
          <small>Current security state</small>
          <strong>{status.replace("_", " ")}</strong>
          <span>
            Evidence updated {current?.observedAt.toLocaleString() ?? "never"}
          </span>
        </div>
      </div>

      <div className="evidence-grid">
        <article>
          <span>Executable fingerprint</span>
          <code title={current?.executableHash}>
            {short(current?.executableHash ?? null, 15, 10)}
          </code>
          <small>
            {current === undefined
              ? "Size unavailable"
              : `${current.executableSize.toLocaleString()} bytes`}
          </small>
        </article>
        <article>
          <span>Deployment slot</span>
          <strong>
            {current?.deploymentSlot.toLocaleString() ?? "Unknown"}
          </strong>
          <small>Finalized observation</small>
        </article>
        <article>
          <span>Upgrade authority</span>
          <code title={current?.upgradeAuthority ?? undefined}>
            {current?.upgradeAuthority === null
              ? "IMMUTABLE"
              : short(current?.upgradeAuthority ?? null)}
          </code>
          <small>
            {current?.upgradeAuthority === null
              ? "Authority removed"
              : "Program remains upgradeable"}
          </small>
        </article>
        <article>
          <span>ProgramData</span>
          <code>{short(result.program.programDataAddress)}</code>
          <small>{result.program.monitoringStatus} monitoring</small>
        </article>
      </div>

      <div className="profile-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Version history</h2>
              <p>Immutable fingerprints observed over time.</p>
            </div>
            <span>{result.snapshots.length} versions</span>
          </div>
          <div className="version-list">
            {result.snapshots.map((snapshot, index) => (
              <div className="version-row" key={snapshot.id}>
                <div className="version-node">
                  <i />
                  <span />
                </div>
                <div>
                  <b>
                    {index === 0
                      ? "Current deployment"
                      : `Version ${result.snapshots.length - index}`}
                  </b>
                  <small>{snapshot.observedAt.toLocaleString()}</small>
                </div>
                <code>{short(snapshot.executableHash, 12, 8)}</code>
                <span>slot {snapshot.deploymentSlot.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
        <aside className="panel trust-panel">
          <div className="panel-heading">
            <div>
              <h2>Verification</h2>
              <p>Current trust relationship.</p>
            </div>
          </div>
          <dl>
            <div>
              <dt>Deployment</dt>
              <dd>{status.toUpperCase()}</dd>
            </div>
            <div>
              <dt>IDL</dt>
              <dd>
                {current?.idlHash === null || current === undefined
                  ? "UNAVAILABLE"
                  : "AVAILABLE"}
              </dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>
                {current?.sourceVerificationStatus.toUpperCase() ??
                  "UNAVAILABLE"}
              </dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>
                <code>{short(current?.programOwner ?? null)}</code>
              </dd>
            </div>
          </dl>
          <p className="evidence-note">
            This profile reports observed facts. It is not a safety
            certification or endorsement.
          </p>
        </aside>
      </div>

      <section className="panel event-panel">
        <div className="panel-heading">
          <div>
            <h2>Security events</h2>
            <p>Rule-generated changes requiring attention.</p>
          </div>
          <span>{result.events.length} recorded</span>
        </div>
        {result.events.length === 0 ? (
          <div className="empty">
            <strong>No deployment transitions recorded.</strong>
            <p>The current snapshot is the monitored baseline.</p>
          </div>
        ) : (
          <div className="event-list">
            {result.events.map((event) => {
              const explanation = explanationByEvent.get(event.id);
              return (
                <Link
                  className="event-row"
                  href={`/program/${result.program.address}/events/${event.id}`}
                  key={event.id}
                >
                  <span className={`severity ${event.severity}`}>
                    {event.severity}
                  </span>
                  <div>
                    <b>{event.type.replaceAll("_", " ")}</b>
                    <small>{event.detectedAt.toLocaleString()}</small>
                    {explanation === undefined ? null : (
                      <p>{explanation.explanation.summary}</p>
                    )}
                  </div>
                  <code>{short(event.currentSnapshotId, 8, 6)}</code>
                  <strong>View evidence →</strong>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
