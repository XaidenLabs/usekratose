import { backendUrl, requireDashboardSession } from "@/lib/backend";

type RouteContext = {
  readonly params: Promise<{ readonly programId: string }>;
};

async function proxy(
  request: Request,
  context: RouteContext,
  method: "PATCH" | "DELETE",
): Promise<Response> {
  const { accessToken } = await requireDashboardSession();
  const { programId } = await context.params;
  const response = await fetch(
    backendUrl(`/api/v1/dashboard/programs/${encodeURIComponent(programId)}`),
    {
      method,
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...(method === "PATCH" ? { "content-type": "application/json" } : {}),
      },
      ...(method === "PATCH" ? { body: await request.text() } : {}),
    },
  );
  return new Response(response.status === 204 ? null : await response.text(), {
    ...(response.status === 204
      ? {}
      : {
          headers: {
            "content-type":
              response.headers.get("content-type") ?? "application/json",
          },
        }),
    status: response.status,
  });
}

export function PATCH(request: Request, context: RouteContext) {
  return proxy(request, context, "PATCH");
}

export function DELETE(request: Request, context: RouteContext) {
  return proxy(request, context, "DELETE");
}
