import {
  deriveProgramSecurityStatus,
  hashCanonicalJson,
} from "@usekratose/core";
import {
  GeminiProgramAnalysisProvider,
  type ProgramAnalysisEvidence,
} from "@usekratose/explanations";
import type { StoredProgramAnalysis } from "@usekratose/database";
import type { ProgramFixReview } from "@usekratose/database";

import {
  authenticateDashboardRequest,
  dashboardUnauthorized,
} from "@/lib/dashboard-api-auth";
import { createServerDatabase } from "@/lib/database";
import { loadProgramContext } from "@/lib/program-query";
import { serializeEvent, serializeSnapshot } from "@/lib/serialize";
import { bearerToken, loadSourceEvidence } from "@/lib/source-workspace";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

function responseData(
  record: StoredProgramAnalysis,
  cached: boolean,
  fixes: readonly ProgramFixReview[],
) {
  return {
    analysisId: record.id,
    analysis: record.analysis,
    cached,
    createdAt: record.createdAt.toISOString(),
    currentSnapshotId: record.currentSnapshotId,
    model: record.model,
    provider: record.provider,
    fixes: fixes.map((fix) => ({
      ...fix,
      createdAt: fix.createdAt.toISOString(),
      decidedAt: fix.decidedAt?.toISOString() ?? null,
      updatedAt: fix.updatedAt.toISOString(),
    })),
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ programId: string }> },
): Promise<Response> {
  const user = await authenticateDashboardRequest(request);
  if (user === null) return dashboardUnauthorized();
  const token = bearerToken(request);
  if (token === null) return dashboardUnauthorized();

  const database = createServerDatabase();
  if (database === null) {
    return Response.json(
      {
        error: { code: "CONFIGURATION_ERROR", message: "Database unavailable" },
      },
      { status: 503 },
    );
  }

  try {
    const { programId } = await context.params;
    const project = await database.store.getProjectForUser(user.id);
    if (project === null) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Workspace not found" } },
        { status: 404 },
      );
    }

    const result = await loadProgramContext(
      database.store,
      programId,
      project.id,
    );
    if (result === null || result.snapshots[0] === undefined) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Program evidence not found" } },
        { status: 404 },
      );
    }

    const currentSnapshot = result.snapshots[0];
    const workspace = await database.store.getProgramSourceWorkspace(
      project.id,
      result.program.id,
    );
    const sourceFiles =
      workspace === null
        ? []
        : await loadSourceEvidence(database.store, workspace, token);
    const evidenceInput: ProgramAnalysisEvidence = {
      attachedIdl: workspace?.idl ?? null,
      currentSnapshot: serializeSnapshot(currentSnapshot),
      events: result.events.map((event) => ({
        ...serializeEvent(event),
        id: event.id,
        severity: event.severity,
        type: event.type,
      })),
      program: {
        ...result.program,
        availableEventCount: result.events.length,
        availableSnapshotCount: result.snapshots.length,
        securityStatus: deriveProgramSecurityStatus({
          hasPriorSnapshot: result.snapshots.length > 1,
          snapshot: currentSnapshot,
        }),
      },
      snapshots: result.snapshots.map((snapshot) => ({
        ...serializeSnapshot(snapshot),
        id: snapshot.id,
      })),
      sourceFiles,
    };
    const evidenceHash = hashCanonicalJson(evidenceInput);
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
    const provider = "gemini";
    const promptVersion = GeminiProgramAnalysisProvider.promptVersion;
    const cached = await database.store.getProgramAnalysis({
      currentSnapshotId: currentSnapshot.id,
      evidenceHash,
      model,
      programId: result.program.id,
      promptVersion,
      provider,
    });
    if (cached !== null) {
      const fixes = await database.store.saveProgramFixReviews(
        cached.id,
        cached.analysis.corrections,
      );
      return Response.json({ data: responseData(cached, true, fixes) });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return Response.json(
        {
          error: {
            code: "AI_NOT_CONFIGURED",
            message: "Add GEMINI_API_KEY to .env.local to enable AI analysis.",
          },
        },
        { status: 503 },
      );
    }

    const analysis = await new GeminiProgramAnalysisProvider(
      apiKey,
      model,
    ).analyze(evidenceInput);
    const saved = await database.store.saveProgramAnalysis({
      analysis,
      currentSnapshotId: currentSnapshot.id,
      evidenceHash,
      evidenceInput,
      model,
      programId: result.program.id,
      promptVersion,
      provider,
    });
    const fixes = await database.store.saveProgramFixReviews(
      saved.id,
      saved.analysis.corrections,
    );
    await database.store.recordMetric({
      metadata: { cached: false, model },
      metricName: "program_ai_analysis_generated",
      programId: result.program.id,
      projectId: project.id,
    });
    return Response.json({ data: responseData(saved, false, fixes) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI analysis failed";
    return Response.json(
      { error: { code: "AI_ANALYSIS_FAILED", message } },
      { status: 502 },
    );
  } finally {
    await database.close();
  }
}
