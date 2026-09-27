import type { Metadata } from "next";

import { BrandLogo } from "@/components/brand-logo";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <a className="brand" href={process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3000"}>
          <BrandLogo />
          <span>UseKratose</span>
        </a>
        <div>
          <span className="eyebrow">Continuous program security</span>
          <h1>Your deployed program never stops changing.</h1>
          <p>Track the bytes, authorities, interfaces, and verification state that define every Solana deployment.</p>
        </div>
        <small>Deterministic evidence. No synthetic risk scores.</small>
      </section>
      <section className="login-form-panel">
        <LoginForm />
      </section>
    </main>
  );
}
