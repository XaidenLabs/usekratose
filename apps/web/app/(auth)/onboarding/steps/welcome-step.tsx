"use client";

interface WelcomeStepProps {
  readonly onContinue: () => void;
  readonly programAddress: string | null;
  readonly projectId: string | null;
}

export function WelcomeStep({
  onContinue,
  programAddress,
  projectId,
}: WelcomeStepProps) {
  return (
    <div className="onboarding-step welcome-step">
      <div className="welcome-icon">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--acid)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </div>
      <h2>You&apos;re all set!</h2>
      <p className="welcome-subtitle">
        Your UseKratose workspace is ready. Here&apos;s what we set up:
      </p>
      <div className="welcome-summary">
        <div className="welcome-item">
          <span className="welcome-check">✓</span>
          <div>
            <strong>Project created</strong>
            <span>{projectId ?? "—"}</span>
          </div>
        </div>
        {programAddress && (
          <div className="welcome-item">
            <span className="welcome-check">✓</span>
            <div>
              <strong>Program monitored</strong>
              <span>
                {programAddress.slice(0, 8)}…{programAddress.slice(-6)}
              </span>
            </div>
          </div>
        )}
        <div className="welcome-item">
          <span className="welcome-check">✓</span>
          <div>
            <strong>Security monitoring active</strong>
            <span>WebSocket + reconciliation coverage</span>
          </div>
        </div>
      </div>
      <button
        className="button auth-submit welcome-cta"
        onClick={onContinue}
        type="button"
      >
        Open security console →
      </button>
    </div>
  );
}
