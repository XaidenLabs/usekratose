import type { Metadata } from "next";

import { BrandLogo } from "@/components/brand-logo";

import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <a className="brand" href={process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3000"}><BrandLogo /><span>UseKratose</span></a>
        <div><span className="eyebrow">Start monitoring</span><h1>Build a living security record.</h1><p>Create your workspace, establish a deployment baseline, and preserve every security-relevant transition.</p></div>
        <small>Read-only monitoring. No wallet authority required.</small>
      </section>
      <section className="login-form-panel"><SignupForm /></section>
    </main>
  );
}
