import { redirect } from "next/navigation";

import { backendUrl, requireDashboardSession } from "@/lib/backend";

export async function GET(request: Request): Promise<never> {
  const { accessToken } = await requireDashboardSession();
  const url = new URL(request.url);
  const installationId = url.searchParams.get("installation_id");
  const state = url.searchParams.get("state");
  if (!installationId || !state) redirect("/programs?github=invalid");
  const response = await fetch(
    backendUrl("/api/v1/dashboard/github/complete"),
    {
      body: JSON.stringify({ installationId, state }),
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      method: "POST",
    },
  );
  redirect(
    response.ok ? "/programs?github=installed" : "/programs?github=failed",
  );
}
