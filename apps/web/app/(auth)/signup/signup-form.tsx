"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

function getPasswordStrength(password: string): {
  label: string;
  level: number;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: "Weak", level: 1 };
  if (score <= 2) return { label: "Fair", level: 2 };
  if (score <= 3) return { label: "Good", level: 3 };
  return { label: "Strong", level: 4 };
}

export function SignupForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const strength = getPasswordStrength(password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setPending(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/onboarding`,
      },
    });

    if (authError) {
      setError(authError.message);
      setPending(false);
      return;
    }

    setConfirmationSent(true);
    setPending(false);
  }

  async function handleOAuth(provider: "github" | "google") {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=/onboarding`,
      },
    });
  }

  if (confirmationSent) {
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
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1>Check your email</h1>
          <p>
            We sent a confirmation link to <strong>{email}</strong>. Click it to
            activate your account and start onboarding.
          </p>
        </div>
        <button
          className="button auth-submit"
          onClick={() => router.push("/login")}
          type="button"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <h1>Create your account</h1>
        <p>Start verifying Solana program deployments</p>
      </div>

      <div className="oauth-buttons">
        <button
          className="oauth-btn"
          onClick={() => handleOAuth("github")}
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Continue with GitHub
        </button>
        <button
          className="oauth-btn"
          onClick={() => handleOAuth("google")}
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>
      </div>

      <div className="auth-divider">
        <span>or</span>
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
        <label>
          Password
          <input
            autoComplete="new-password"
            name="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
            type="password"
            value={password}
          />
          {password.length > 0 && (
            <div className="password-strength">
              <div className="strength-bar">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    className={`strength-segment ${level <= strength.level ? `strength-${strength.level}` : ""}`}
                    key={level}
                  />
                ))}
              </div>
              <span className={`strength-label strength-${strength.level}`}>
                {strength.label}
              </span>
            </div>
          )}
        </label>
        <label>
          Confirm password
          <input
            autoComplete="new-password"
            name="confirmPassword"
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            required
            type="password"
            value={confirmPassword}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="button auth-submit" disabled={pending} type="submit">
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="auth-footer-text">
        Already have an account?{" "}
        <Link className="auth-link accent" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
