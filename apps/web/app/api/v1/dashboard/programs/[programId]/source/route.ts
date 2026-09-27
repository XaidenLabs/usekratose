import { createIdlEvidence } from "@usekratose/core";
import type { ProgramSourceWorkspace } from "@usekratose/database";
import { z } from "zod";

import {
  authenticateDashboardRequest,
  dashboardUnauthorized,
} from "@/lib/dashboard-api-auth";
import { createServerDatabase } from "@/lib/database";
import {
  parseGitHubRepositoryUrl,
  retrieveGitHubSource,
} from "@/lib/github-source";
import { loadProgramContext } from "@/lib/program-query";
import {
  bearerToken,
  downloadArtifact,
  loadSourceEvidence,
  MAX_SOURCE_FILE_BYTES,
  normalizeSourcePath,
  sha256,
  sourceLanguage,
} from "@/lib/source-workspace";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("connect-github"),
    installationId: z.string().regex(/^\d+$/).nullable().optional(),
    repositoryUrl: z.string().url(),
    revision: z.string().trim().min(1).max(200).optional(),
  }),
  z.object({
    action: z.literal("register-uploads"),
    uploads: z
      .array(
        z.object({
          filePath: z.string().min(1).max(300),
          kind: z.enum(["binary", "idl", "source"]),
          objectPath: z.string().min(1).max(700),
        }),
      )
      .min(1)
      .max(50),
  }),
]);

function serializeWorkspace(
  workspace: ProgramSourceWorkspace,
  sourceFiles: readonly { readonly content: string; readonly path: string }[],
) {
  return {
    ...workspace,
    createdAt: workspace.createdAt.toISOString(),
    files: workspace.files.map((file) => ({
      ...file,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
    })),
    sourceFiles,
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

async function contextFor(request: Request, programId: string) {
  const user = await authenticateDashboardRequest(request);
  if (user === null) return { error: dashboardUnauthorized() } as const;
  const token = bearerToken(request);
  if (token === null) return { error: dashboardUnauthorized() } as const;
  const database = createServerDatabase();
  if (database === null) {
    return {
      error: Response.json(
        { error: { message: "Database unavailable" } },
        { status: 503 },
      ),
    } as const;
  }
  const project = await database.store.getProjectForUser(user.id);
  const context =
    project === null
      ? null
      : await loadProgramContext(database.store, programId, project.id);
  if (project === null || context === null) {
    await database.close();
    return {
      error: Response.json(
        { error: { message: "Program not found" } },
        { status: 404 },
      ),
    } as const;
  }
  return { context, database, project, token, user } as const;
}

export async function GET(
  request: Request,
  route: { params: Promise<{ programId: string }> },
): Promise<Response> {
  const { programId } = await route.params;
  const loaded = await contextFor(request, programId);
  if ("error" in loaded) return loaded.error;
  try {
    const workspace = await loaded.database.store.getProgramSourceWorkspace(
      loaded.project.id,
      loaded.context.program.id,
    );
    if (workspace === null) return Response.json({ data: null });
    const sourceFiles = await loadSourceEvidence(
      loaded.database.store,
      workspace,
      loaded.token,
    );
    return Response.json({ data: serializeWorkspace(workspace, sourceFiles) });
  } finally {
    await loaded.database.close();
  }
}

export async function POST(
  request: Request,
  route: { params: Promise<{ programId: string }> },
): Promise<Response> {
  const { programId } = await route.params;
  const loaded = await contextFor(request, programId);
  if ("error" in loaded) return loaded.error;
  try {
    const parsed = requestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return Response.json(
        { error: { message: "Invalid source workspace request" } },
        { status: 400 },
      );
    }
    if (parsed.data.action === "connect-github") {
      const repository = parseGitHubRepositoryUrl(parsed.data.repositoryUrl);
      const source = await retrieveGitHubSource({
        ...(parsed.data.installationId === undefined
          ? {}
          : { installationId: parsed.data.installationId }),
        repository,
        ...(parsed.data.revision === undefined
          ? {}
          : { revision: parsed.data.revision }),
      });
      const workspace =
        await loaded.database.store.upsertProgramSourceWorkspace({
          baseBranch: source.baseBranch,
          githubInstallationId: parsed.data.installationId ?? null,
          programId: loaded.context.program.id,
          projectId: loaded.project.id,
          provider: "github",
          repositoryName: repository.name,
          repositoryOwner: repository.owner,
          repositoryUrl: repository.url,
          revision: source.revision,
        });
      await loaded.database.store.replaceProgramSourceFiles(
        workspace.id,
        source.files.map((file) => ({
          language: file.language,
          objectPath: null,
          path: file.path,
          size: file.size,
          sourceHash: file.hash,
        })),
      );
    } else {
      let workspace = await loaded.database.store.getProgramSourceWorkspace(
        loaded.project.id,
        loaded.context.program.id,
      );
      if (workspace === null || workspace.provider !== "upload") {
        workspace = await loaded.database.store.upsertProgramSourceWorkspace({
          programId: loaded.context.program.id,
          projectId: loaded.project.id,
          provider: "upload",
        });
      }
      const sourceFiles: {
        language: string;
        objectPath: string;
        path: string;
        size: number;
        sourceHash: string;
      }[] = [];
      for (const upload of parsed.data.uploads) {
        if (
          !upload.objectPath.startsWith(
            `${loaded.user.id}/${loaded.context.program.id}/`,
          )
        ) {
          throw new Error("Artifact object path is outside the user workspace");
        }
        const bytes = await downloadArtifact(loaded.token, upload.objectPath);
        if (upload.kind === "source") {
          if (bytes.byteLength > MAX_SOURCE_FILE_BYTES) {
            throw new Error("Source file exceeds the 100 KB limit");
          }
          const path = normalizeSourcePath(upload.filePath);
          new TextDecoder("utf-8", { fatal: true }).decode(bytes);
          sourceFiles.push({
            language: sourceLanguage(path),
            objectPath: upload.objectPath,
            path,
            size: bytes.byteLength,
            sourceHash: sha256(bytes),
          });
        } else if (upload.kind === "idl") {
          const idl = JSON.parse(
            new TextDecoder("utf-8", { fatal: true }).decode(bytes),
          ) as unknown;
          const evidence = createIdlEvidence(idl);
          await loaded.database.store.saveProgramArtifactEvidence({
            idl: evidence.normalized,
            idlHash: evidence.hash,
            workspaceId: workspace.id,
          });
        } else {
          const hash = sha256(bytes);
          await loaded.database.store.saveProgramArtifactEvidence({
            binaryHash: hash,
            binaryMatchesDeployment:
              hash === loaded.context.snapshots[0]?.executableHash,
            binarySize: bytes.byteLength,
            workspaceId: workspace.id,
          });
        }
      }
      if (sourceFiles.length > 0) {
        const retainedFiles = workspace.files
          .filter(
            (file) =>
              !sourceFiles.some((sourceFile) => sourceFile.path === file.path),
          )
          .map((file) => ({
            language: file.language,
            objectPath: file.objectPath,
            path: file.path,
            size: file.size,
            sourceHash: file.sourceHash,
          }));
        await loaded.database.store.replaceProgramSourceFiles(workspace.id, [
          ...retainedFiles,
          ...sourceFiles,
        ]);
      }
    }
    const saved = await loaded.database.store.getProgramSourceWorkspace(
      loaded.project.id,
      loaded.context.program.id,
    );
    if (saved === null) throw new Error("Source workspace was not saved");
    const evidence = await loadSourceEvidence(
      loaded.database.store,
      saved,
      loaded.token,
    );
    return Response.json({ data: serializeWorkspace(saved, evidence) });
  } catch (error) {
    return Response.json(
      {
        error: {
          message:
            error instanceof Error ? error.message : "Source setup failed",
        },
      },
      { status: 422 },
    );
  } finally {
    await loaded.database.close();
  }
}
