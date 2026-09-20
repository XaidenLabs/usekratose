import Link from "next/link";

const facts = [
  ["Executable", "sha256:4e10…dec1", "changed"],
  ["Deployment", "slot 500,211,760", "changed"],
  ["Authority", "AZ61…PnoA", "unchanged"],
  ["Verification", "STALE", "review"],
] as const;

export default function LandingPage() {
  return (
    <>
      <section className="hero shell">
        <div className="eyebrow">
          <span className="pulse" /> Continuous Solana security
        </div>
        <h1>
          Audits are snapshots.
          <br />
          <em>Deployments keep moving.</em>
        </h1>
        <p className="hero-copy">
          UseKratose continuously verifies what is actually deployed, detects
          security-relevant changes, and preserves the evidence your team needs
          to review every upgrade.
        </p>
        <div className="hero-actions">
          <Link className="button" href="/monitor">
            Monitor a Solana program <span>→</span>
          </Link>
          <Link className="text-link" href="/dashboard">
            View live console <span>↗</span>
          </Link>
        </div>
        <div className="proof-strip">
          <span>Deterministic</span>
          <span>•</span>
          <span>Evidence-first</span>
          <span>•</span>
          <span>WebSocket + reconciliation</span>
          <span>•</span>
          <span>No fake risk scores</span>
        </div>
      </section>

      <section className="shell hero-console">
        <div className="console-topbar">
          <div>
            <i />
            <i />
            <i />
          </div>
          <span>SECURITY EVENT / PROGRAM_UPGRADED</span>
          <span className="severity high">HIGH</span>
        </div>
        <div className="console-grid">
          <div className="console-summary">
            <span className="kicker">Deployment transition</span>
            <h2>Trusted assumptions changed.</h2>
            <p>
              A new executable fingerprint was observed after the verified
              baseline.
            </p>
            <div className="timeline-mini">
              <b>v1</b>
              <span />
              <strong>Upgrade detected</strong>
              <span />
              <b>v2</b>
            </div>
          </div>
          <div className="fact-list">
            {facts.map(([label, value, state]) => (
              <div className="fact-row" key={label}>
                <span>{label}</span>
                <code>{value}</code>
                <strong className={state === "unchanged" ? "muted" : "accent"}>
                  {state}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="shell section">
        <div className="section-heading">
          <span className="kicker">Security that follows the program</span>
          <h2>From deployed bytes to an explainable delta.</h2>
          <p>
            Every conclusion begins with on-chain state. Optional metadata and
            AI can add context, but never rewrite the facts.
          </p>
        </div>
        <div className="feature-grid">
          <article>
            <span>01</span>
            <h3>Watch the deployment</h3>
            <p>
              Resolve ProgramData, fingerprint executable bytes, and recover
              missed WebSocket signals through finalized reconciliation.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Diff the assumptions</h3>
            <p>
              Track authorities, owners, IDLs, signer requirements, writable
              accounts, source references, and verification state.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Deliver the evidence</h3>
            <p>
              Signed webhooks, versioned API responses, public profiles, and
              concise review guidance reach the teams that need them.
            </p>
          </article>
        </div>
      </section>

      <section className="shell manifesto">
        <span className="kicker">The UseKratose rule</span>
        <blockquote>
          “We do not tell you a program is safe. We tell you exactly what
          changed, what is still verified, and what requires review.”
        </blockquote>
        <Link className="button button-light" href="/monitor">
          Establish a baseline →
        </Link>
      </section>
    </>
  );
}
