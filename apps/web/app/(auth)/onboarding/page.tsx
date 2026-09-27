import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getUserProject, requireSession } from "@/lib/auth";
import { configuredDefaultCluster } from "@/lib/solana-rpc";

import { OnboardingWizard } from "./onboarding-wizard";

export const metadata: Metadata = { title: "Welcome to UseKratose" };

export default async function OnboardingPage() {
  const session = await requireSession();
  if ((await getUserProject(session.id)) !== null) redirect("/dashboard");

  return (
    <div className="onboarding-page">
      <OnboardingWizard defaultCluster={configuredDefaultCluster()} />
    </div>
  );
}
