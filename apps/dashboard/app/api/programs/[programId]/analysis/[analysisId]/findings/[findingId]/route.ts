import { backendUrl, requireDashboardSession } from "@/lib/backend";

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      analysisId: string;
      findingId: string;
      programId: string;
    }>;
  },
): Promise<Response> {
  const { accessToken } = await requireDashboardSession();
  const { analysisId, findingId, programId } = await context.params;
  const response = await fetch(
    backendUrl(
      `/api/v1/dashboard/programs/${programId}/analysis/${analysisId}/findings/${findingId}`,
    ),
    {
      body: await request.text(),
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
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
