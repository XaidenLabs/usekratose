import {
  authenticateDashboardRequest,
  dashboardUnauthorized,
} from "@/lib/dashboard-api-auth";
import { createServerDatabase } from "@/lib/database";
import { createGitHubInstallationState } from "@/lib/github-installation-state";
import { loadProgramContext } from "@/lib/program-query";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  route: { params: Promise<{ programId: string }> },
): Promise<Response> {
  const user = await authenticateDashboardRequest(request);
  if (user === null) return dashboardUnauthorized();
  const database = createServerDatabase();
  if (database === null) {
    return Response.json(
      { error: { message: "Database unavailable" } },
      { status: 503 },
    );
  }
  try {
    const { programId } = await route.params;
    const project = await database.store.getProjectForUser(user.id);
    const context =
      project === null
        ? null
        : await loadProgramContext(database.store, programId, project.id);
    if (project === null || context === null) {
      return Response.json(
        { error: { message: "Program not found" } },
        { status: 404 },
      );
    }
    const slug = process.env.GITHUB_APP_SLUG?.trim();
    if (!slug) {
      return Response.json(
        { error: { message: "GitHub App is not configured" } },
        { status: 503 },
      );
    }
    const state = createGitHubInstallationState(user.id, context.program.id);
    return Response.json({
      data: {
        url: `https://github.com/apps/${encodeURIComponent(slug)}/installations/new?state=${encodeURIComponent(state)}`,
      },
    });
  } finally {
    await database.close();
  }
}
