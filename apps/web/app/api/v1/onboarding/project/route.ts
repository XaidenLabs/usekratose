import { randomUUID } from "node:crypto";

import { z } from "zod";

import { getSession } from "@/lib/auth";
import { createServerDatabase } from "@/lib/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (session === null) {
    return Response.json(
      { error: { message: "Unauthorized" } },
      { status: 401 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: { message: "A project name of 1-100 characters is required" } },
      { status: 400 },
    );
  }

  const database = createServerDatabase();
  if (database === null) {
    return Response.json(
      { error: { message: "Database not configured" } },
      { status: 503 },
    );
  }

  try {
    const project = await database.store.createProjectForUser({
      name: parsed.data.name,
      projectId: randomUUID(),
      userId: session.id,
    });
    return Response.json({ projectId: project.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create user project", { error });
    return Response.json(
      { error: { message: "Failed to create project" } },
      { status: 500 },
    );
  } finally {
    await database.close();
  }
}
