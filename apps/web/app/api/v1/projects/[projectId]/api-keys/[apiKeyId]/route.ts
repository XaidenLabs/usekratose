import { ApiKeyService } from "@usekratose/application";
import { hasControlPlaneAccess } from "@/lib/api-server";
import { createServerDatabase } from "@/lib/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ apiKeyId: string; projectId: string }> },
): Promise<Response> {
  if (!hasControlPlaneAccess(request)) {
    return Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  const pepper = process.env.API_KEY_PEPPER;
  const database = createServerDatabase();
  if (database === null || pepper === undefined) {
    return Response.json({}, { status: 503 });
  }
  try {
    const { apiKeyId, projectId } = await context.params;
    const revoked = await new ApiKeyService(database.store, pepper).revoke(
      apiKeyId,
      projectId,
    );
    return revoked
      ? new Response(null, { status: 204 })
      : Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  } finally {
    await database.close();
  }
}
