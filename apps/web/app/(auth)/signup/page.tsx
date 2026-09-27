import type { Metadata } from "next";

import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="auth-page">
      <div className="auth-side">
        <div className="auth-side-content">
          <div className="auth-tagline">
            <span className="eyebrow">
              <span className="pulse" /> Start for free
            </span>
            <h2>
              Evidence-first
              <br />
              Solana monitoring.
            </h2>
            <p>
              Track every upgrade, authority change, and IDL mutation. Get
              deterministic evidence — not guesswork.
            </p>
          </div>
          <div className="auth-features">
            <div className="auth-feature">
              <span className="auth-feature-icon">◈</span>
              <div>
                <strong>Deployment fingerprints</strong>
                <span>SHA-256 hash of on-chain executable bytes</span>
              </div>
            </div>
            <div className="auth-feature">
              <span className="auth-feature-icon">◈</span>
              <div>
                <strong>Signed webhook alerts</strong>
                <span>HMAC-verified notifications on every change</span>
              </div>
            </div>
            <div className="auth-feature">
              <span className="auth-feature-icon">◈</span>
              <div>
                <strong>Public security profiles</strong>
                <span>Share objective evidence with your community</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-main">
        <SignupForm />
      </div>
    </div>
  );
}
