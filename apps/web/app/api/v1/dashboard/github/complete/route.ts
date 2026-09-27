import { z } from "zod";

import {
  authenticateDashboardRequest,
  dashboardUnauthorized,
} from "@/lib/dashboard-api-auth";
import { createServerDatabase } from "@/lib/database";
import { verifyGitHubInstallationState } from "@/lib/github-installation-state";
import { loadProgramContext } from "@/lib/program-query";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  installationId: z.string().regex(/^\d+$/),
  state: z.string().min(20),
});

export async function POST(request: Request): Promise<Response> {
  const user = await authenticateDashboardRequest(request);
  if (user === null) return dashboardUnauthorized();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: { message: "GitHub installation response is invalid" } },
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
    const state = verifyGitHubInstallationState(parsed.data.state);
    if (state.userId !== user.id) {
      return Response.json(
        { error: { message: "GitHub installation user mismatch" } },
        { status: 403 },
      );
    }
    const project = await database.store.getProjectForUser(user.id);
    const context =
      project === null
        ? null
        : await loadProgramContext(database.store, state.programId, project.id);
    if (project === null || context === null) {
      return Response.json(
        { error: { message: "Program not found" } },
        { status: 404 },
      );
    }
    const workspace = await database.store.upsertProgramSourceWorkspace({
      githubInstallationId: parsed.data.installationId,
      programId: context.program.id,
      projectId: project.id,
      provider: "github",
      status: "connected",
    });
    return Response.json({ data: { programId: workspace.programId } });
  } catch (error) {
    return Response.json(
      {
        error: {
          message:
            error instanceof Error
              ? error.message
              : "GitHub installation failed",
        },
      },
      { status: 422 },
    );
  } finally {
    await database.close();
  }
}
