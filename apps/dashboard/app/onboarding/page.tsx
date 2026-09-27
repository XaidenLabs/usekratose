import type { Metadata } from "next";

import { BrandLogo } from "@/components/brand-logo";

import { requireDashboardSession } from "@/lib/backend";

import { WorkspaceForm } from "./workspace-form";

export const metadata: Metadata = { title: "Create workspace" };

export default async function OnboardingPage() {
  const { user } = await requireDashboardSession();
  const suggestedName =
    typeof user.user_metadata.full_name === "string"
      ? `${user.user_metadata.full_name}'s workspace`
      : "My security workspace";

  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <a className="brand" href={process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3000"}>
          <BrandLogo />
          <span>UseKratose</span>
        </a>
        <div>
          <span className="eyebrow">One final step</span>
          <h1>Create your security workspace.</h1>
          <p>Your programs, immutable snapshots, events, alert destinations, and API keys are isolated inside this workspace.</p>
        </div>
        <small>Workspace ownership is bound to your verified Supabase identity.</small>
      </section>
      <section className="login-form-panel">
        <WorkspaceForm suggestedName={suggestedName} />
      </section>
    </main>
  );
}
