"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const result = await getSupabaseBrowserClient().auth.signInWithPassword({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    });
    if (result.error !== null) {
      setError(result.error.message);
      setPending(false);
      return;
    }
    router.replace("/overview");
    router.refresh();
  }

  return (
    <div className="login-card">
      <div>
        <span className="eyebrow">Security console</span>
        <h2>Welcome back</h2>
        <p>Sign in with your UseKratose account.</p>
      </div>
      <form onSubmit={submit}>
        <label>
          Email address
          <input autoComplete="email" name="email" placeholder="you@company.com" required type="email" />
        </label>
        <label>
          Password
          <input autoComplete="current-password" minLength={8} name="password" required type="password" />
        </label>
        {error === null ? null : <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={pending} type="submit">
          {pending ? <LoaderCircle className="spin" size={16} /> : null}
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="login-help">Account creation remains on the main UseKratose application.</p>
    </div>
  );
}
