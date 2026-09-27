import { AppShell } from "@/components/app-shell";
import { getDashboardData } from "@/lib/backend";

export default async function ConsoleLayout({ children }: { readonly children: React.ReactNode }) {
  const data = await getDashboardData();
  return (
    <AppShell profile={data.profile} workspace={data.workspace}>
      {children}
    </AppShell>
  );
}
