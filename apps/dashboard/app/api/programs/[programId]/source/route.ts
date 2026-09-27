import { backendUrl, requireDashboardSession } from "@/lib/backend";

async function proxy(
  request: Request,
  context: { params: Promise<{ programId: string }> },
  method: "GET" | "POST",
): Promise<Response> {
  const { accessToken } = await requireDashboardSession();
  const { programId } = await context.params;
  const response = await fetch(
    backendUrl(`/api/v1/dashboard/programs/${programId}/source`),
    {
      ...(method === "POST" ? { body: await request.text() } : {}),
      cache: "no-store",
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...(method === "POST" ? { "content-type": "application/json" } : {}),
      },
      method,
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

export function GET(
  request: Request,
  context: { params: Promise<{ programId: string }> },
): Promise<Response> {
  return proxy(request, context, "GET");
}

export function POST(
  request: Request,
  context: { params: Promise<{ programId: string }> },
): Promise<Response> {
  return proxy(request, context, "POST");
}
