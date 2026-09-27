import { backendUrl, requireDashboardSession } from "@/lib/backend";

export async function POST(request: Request): Promise<Response> {
  const { accessToken } = await requireDashboardSession();
  const response = await fetch(backendUrl("/api/v1/dashboard/programs"), {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: await request.text(),
  });
  return new Response(await response.text(), {
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    status: response.status,
  });
}
