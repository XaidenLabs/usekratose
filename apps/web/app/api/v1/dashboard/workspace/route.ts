import { randomUUID } from "node:crypto";

import { z } from "zod";

import {
  authenticateDashboardRequest,
  dashboardUnauthorized,
} from "@/lib/dashboard-api-auth";
import { createServerDatabase } from "@/lib/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function POST(request: Request): Promise<Response> {
  const user = await authenticateDashboardRequest(request);
  if (user === null) return dashboardUnauthorized();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: { message: "A workspace name of 1-100 characters is required" } },
      { status: 400 },
    );
  }

  const database = createServerDatabase();
  if (database === null) {
    return Response.json(
      { error: { message: "Database unavailable" } },
      { status: 503 },
    );
  }

  try {
    const workspace = await database.store.createProjectForUser({
      name: parsed.data.name,
      projectId: randomUUID(),
      userId: user.id,
    });
    return Response.json({ data: { workspace } }, { status: 201 });
  } finally {
    await database.close();
  }
}
