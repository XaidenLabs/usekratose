import { ApiKeyService } from "@usekratose/application";
import { z } from "zod";

import { hasControlPlaneAccess } from "@/lib/api-server";
import { createServerDatabase } from "@/lib/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({ name: z.string().trim().min(1).max(100) });

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  if (!hasControlPlaneAccess(request)) {
    return Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  const database = createServerDatabase();
  if (database === null) return Response.json({}, { status: 503 });
  try {
    const { projectId } = await context.params;
    return Response.json({ data: await database.store.listApiKeys(projectId) });
  } finally {
    await database.close();
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  if (!hasControlPlaneAccess(request)) {
    return Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  const pepper = process.env.API_KEY_PEPPER;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: { code: "INVALID_REQUEST" } },
      { status: 400 },
    );
  }
  const database = createServerDatabase();
  if (database === null || pepper === undefined) {
    return Response.json({}, { status: 503 });
  }
  try {
    const { projectId } = await context.params;
    const key = await new ApiKeyService(database.store, pepper).create({
      name: parsed.data.name,
      projectId,
    });
    return Response.json(
      { data: key, notice: "This API key is shown only once." },
      { status: 201 },
    );
  } finally {
    await database.close();
  }
}
