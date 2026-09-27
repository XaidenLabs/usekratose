import { redirect } from "next/navigation";

export default function LegacyDashboardLayout() {
  const dashboardUrl =
    process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";
  redirect(`${dashboardUrl}/overview`);
}
