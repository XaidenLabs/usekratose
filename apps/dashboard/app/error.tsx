"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        digest: error.digest ?? null,
        event: "dashboard.render.failed",
        level: "error",
        timestamp: new Date().toISOString(),
      }),
    );
  }, [error]);

  return (
    <main className="login-shell">
      <section className="login-form-panel">
        <div className="login-card">
          <span className="eyebrow">Console unavailable</span>
          <h2>We couldn&apos;t load your security workspace.</h2>
          <p>
            Your monitoring data is safe. Retry the request or return shortly.
          </p>
          <button className="primary-button" onClick={reset} type="button">
            Try again
          </button>
        </div>
      </section>
    </main>
  );
}
