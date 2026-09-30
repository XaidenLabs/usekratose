"use client";

import { useEffect } from "react";

export default function ApplicationError({
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
        event: "web.render.failed",
        level: "error",
        timestamp: new Date().toISOString(),
      }),
    );
  }, [error]);

  return (
    <main className="auth-page">
      <div className="auth-main">
        <div className="auth-card">
          <div className="auth-card-header">
            <h1>Something went wrong</h1>
            <p>The request failed safely. Please try again.</p>
          </div>
          <button className="button auth-submit" onClick={reset} type="button">
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
