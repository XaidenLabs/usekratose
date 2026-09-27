import { backendUrl, requireDashboardSession } from "@/lib/backend";

export async function GET(
  _request: Request,
  context: { params: Promise<{ programId: string }> },
): Promise<Response> {
  const { accessToken } = await requireDashboardSession();
  const { programId } = await context.params;
  const response = await fetch(
    backendUrl(`/api/v1/dashboard/programs/${programId}/github/install`),
    {
      cache: "no-store",
      headers: { authorization: `Bearer ${accessToken}` },
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
