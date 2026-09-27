"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    if (resetError) {
      setError(resetError.message);
      setPending(false);
      return;
    }

    setSent(true);
    setPending(false);
  }

  if (sent) {
    return (
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-success-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--acid)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h1>Check your email</h1>
          <p>
            We sent a password reset link to <strong>{email}</strong>. It may
            take a moment to arrive.
          </p>
        </div>
        <Link className="button auth-submit" href="/login">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <h1>Reset password</h1>
        <p>
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email address
          <input
            autoComplete="email"
            name="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            type="email"
            value={email}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="button auth-submit" disabled={pending} type="submit">
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="auth-footer-text">
        Remember your password?{" "}
        <Link className="auth-link accent" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
