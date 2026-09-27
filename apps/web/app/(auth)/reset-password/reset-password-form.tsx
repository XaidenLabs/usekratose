"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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

export function ResetPasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

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
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }

    setSuccess(true);
    setPending(false);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 2000);
  }

  if (success) {
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
          <h1>Password updated</h1>
          <p>Redirecting you to the dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <h1>Set new password</h1>
        <p>Enter your new password below.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          New password
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
          Confirm new password
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
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
