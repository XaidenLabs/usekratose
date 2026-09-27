import { backendUrl, requireDashboardSession } from "@/lib/backend";

export async function POST(request: Request): Promise<Response> {
  const { accessToken } = await requireDashboardSession();
  const response = await fetch(backendUrl("/api/v1/dashboard/workspace"), {
    body: await request.text(),
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    method: "POST",
  });
  return new Response(await response.text(), {
    headers: { "content-type": "application/json" },
    status: response.status,
  });
}
