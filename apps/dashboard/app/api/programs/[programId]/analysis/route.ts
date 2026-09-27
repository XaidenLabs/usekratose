import { backendUrl, requireDashboardSession } from "@/lib/backend";

export async function POST(
  _request: Request,
  context: { params: Promise<{ programId: string }> },
): Promise<Response> {
  const { accessToken } = await requireDashboardSession();
  const { programId } = await context.params;
  const response = await fetch(
    backendUrl(`/api/v1/dashboard/programs/${programId}/analysis`),
    {
      cache: "no-store",
      headers: { authorization: `Bearer ${accessToken}` },
      method: "POST",
    },
  );
  return new Response(await response.text(), {
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
    },
    status: response.status,
  });
}
