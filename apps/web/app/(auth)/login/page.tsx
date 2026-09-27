import type { Metadata } from "next";
import { Suspense } from "react";

import { eventEvidenceValue, eventLabel } from "@/lib/security-activity";
import { getLatestPublicActivity } from "@/lib/ui-data";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const activity = await getLatestPublicActivity(2);
  return (
    <div className="auth-page">
      <div className="auth-side">
        <div className="auth-side-content">
          <div className="auth-tagline">
            <span className="eyebrow">
              <span className="pulse" /> Continuous Solana security
            </span>
            <h2>
              Verify every
              <br />
              deployment upgrade.
            </h2>
            <p>
              Deterministic evidence from on-chain state. No fake risk scores —
              just facts about what changed.
            </p>
          </div>
          <div className="auth-visual">
            {activity.length === 0 ? (
              <div className="auth-event-card">
                <div className="auth-event-topbar">
                  <span>LIVE SECURITY EVENTS</span>
                </div>
                <div className="auth-event-body">
                  <strong>Awaiting first transition</strong>
                  <code>No synthetic data</code>
                </div>
              </div>
            ) : (
              activity.map((item, index) => (
                <div
                  className={`auth-event-card ${index === 1 ? "auth-event-delayed" : ""}`}
                  key={item.event.id}
                >
                  <div className="auth-event-topbar">
                    <span>SECURITY EVENT</span>
                    <span className={`severity ${item.event.severity}`}>
                      {item.event.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="auth-event-body">
                    <strong>{eventLabel(item.event)}</strong>
                    <code>{eventEvidenceValue(item)}</code>
                    <span className="auth-event-time">
                      {item.event.detectedAt.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="auth-main">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
