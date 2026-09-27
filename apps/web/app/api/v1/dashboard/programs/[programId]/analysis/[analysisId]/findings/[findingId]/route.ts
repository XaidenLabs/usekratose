import { applyGroundedPatches } from "@usekratose/explanations";
import { z } from "zod";

import {
  authenticateDashboardRequest,
  dashboardUnauthorized,
} from "@/lib/dashboard-api-auth";
import { createServerDatabase } from "@/lib/database";
import {
  applyGitHubPatches,
  parseGitHubRepositoryUrl,
} from "@/lib/github-source";
import { loadProgramContext } from "@/lib/program-query";
import {
  bearerToken,
  downloadArtifact,
  overwriteArtifact,
  sha256,
} from "@/lib/source-workspace";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

const bodySchema = z.object({ decision: z.enum(["apply", "reject"]) });

export async function POST(
  request: Request,
  route: {
    params: Promise<{
      analysisId: string;
      findingId: string;
      programId: string;
    }>;
  },
): Promise<Response> {
  const user = await authenticateDashboardRequest(request);
  if (user === null) return dashboardUnauthorized();
  const token = bearerToken(request);
  if (token === null) return dashboardUnauthorized();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: { message: "Decision must be apply or reject" } },
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
    const { analysisId, findingId, programId } = await route.params;
    const project = await database.store.getProjectForUser(user.id);
    const context =
      project === null
        ? null
        : await loadProgramContext(database.store, programId, project.id);
    const analysis = await database.store.getProgramAnalysisById(analysisId);
    if (
      project === null ||
      context === null ||
      analysis === null ||
      analysis.programId !== context.program.id
    ) {
      return Response.json(
        { error: { message: "Fix proposal not found" } },
        { status: 404 },
      );
    }
    const review = await database.store.getProgramFixReview(
      analysisId,
      findingId,
    );
    if (review === null) {
      return Response.json(
        { error: { message: "Fix proposal not found" } },
        { status: 404 },
      );
    }
    if (review.status !== "proposed") {
      return Response.json({ data: review });
    }
    if (parsed.data.decision === "reject") {
      const rejected = await database.store.decideProgramFixReview({
        analysisId,
        findingId,
        status: "rejected",
      });
      return Response.json({ data: rejected });
    }

    const workspace = await database.store.getProgramSourceWorkspace(
      project.id,
      context.program.id,
    );
    if (workspace === null) {
      return Response.json(
        { error: { message: "Connect source before applying a fix" } },
        { status: 409 },
      );
    }
    let branchName: string | null = null;
    let pullRequestUrl: string | null = null;
    if (workspace.provider === "github") {
      if (
        !workspace.repositoryUrl ||
        !workspace.baseBranch ||
        !workspace.githubInstallationId
      ) {
        return Response.json(
          {
            error: {
              message:
                "Install the UseKratose GitHub App with write access before applying fixes",
            },
          },
          { status: 409 },
        );
      }
      const applied = await applyGitHubPatches({
        analysisId,
        baseBranch: workspace.baseBranch,
        findingId,
        installationId: workspace.githubInstallationId,
        patches: review.patches,
        repository: parseGitHubRepositoryUrl(workspace.repositoryUrl),
      });
      branchName = applied.branchName;
      pullRequestUrl = applied.pullRequestUrl;
    } else {
      const byPath = new Map<string, typeof review.patches>();
      for (const patch of review.patches) {
        byPath.set(patch.path, [...(byPath.get(patch.path) ?? []), patch]);
      }
      const updatedFiles = [...workspace.files];
      const pendingWrites: { objectPath: string; content: string }[] = [];
      for (const [path, patches] of byPath) {
        const file = workspace.files.find(
          (candidate) => candidate.path === path,
        );
        if (!file?.objectPath)
          throw new Error(`Source file ${path} is unavailable`);
        const bytes = await downloadArtifact(token, file.objectPath);
        if (sha256(bytes) !== file.sourceHash) {
          throw new Error(`Source file ${path} changed after analysis`);
        }
        const current = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        const content = applyGroundedPatches(current, patches);
        pendingWrites.push({ content, objectPath: file.objectPath });
        const index = updatedFiles.findIndex(
          (candidate) => candidate.id === file.id,
        );
        updatedFiles[index] = {
          ...file,
          size: Buffer.byteLength(content),
          sourceHash: sha256(content),
        };
      }
      for (const write of pendingWrites) {
        await overwriteArtifact(token, write.objectPath, write.content);
      }
      await database.store.replaceProgramSourceFiles(
        workspace.id,
        updatedFiles.map((file) => ({
          language: file.language,
          objectPath: file.objectPath,
          path: file.path,
          size: file.size,
          sourceHash: file.sourceHash,
        })),
      );
    }
    const applied = await database.store.decideProgramFixReview({
      analysisId,
      branchName,
      findingId,
      pullRequestUrl,
      status: "applied",
    });
    return Response.json({ data: applied });
  } catch (error) {
    return Response.json(
      {
        error: {
          message:
            error instanceof Error ? error.message : "Fix decision failed",
        },
      },
      { status: 422 },
    );
  } finally {
    await database.close();
  }
}
