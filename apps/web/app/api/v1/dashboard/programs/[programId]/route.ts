import { ProgramIngestionService } from "@usekratose/application";
import { UseKratoseError } from "@usekratose/core";
import { ProgramMetadataIntelligenceClient } from "@usekratose/solana";
import { z } from "zod";

import {
  authenticateDashboardRequest,
  dashboardUnauthorized,
} from "@/lib/dashboard-api-auth";
import { createServerDatabase } from "@/lib/database";
import { serializeSnapshot } from "@/lib/serialize";
import { rpcUrlForCluster, solanaGatewayForCluster } from "@/lib/solana-rpc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  network: z.enum(["devnet", "mainnet-beta"]),
});

type RouteContext = {
  readonly params: Promise<{ readonly programId: string }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await authenticateDashboardRequest(request);
  if (user === null) return dashboardUnauthorized();

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "Valid program name and network required",
        },
      },
      { status: 400 },
    );
  }

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
    const project = await database.store.getProjectForUser(user.id);
    if (project === null) {
      return Response.json(
        {
          error: {
            code: "ONBOARDING_REQUIRED",
            message: "Create a workspace first",
          },
        },
        { status: 409 },
      );
    }

    const { programId } = await context.params;
    const currentProgram = await database.store.getProgramByIdentifier(
      programId,
      project.id,
    );
    if (currentProgram === null) {
      return Response.json(
        {
          error: { code: "NOT_FOUND", message: "Monitored program not found" },
        },
        { status: 404 },
      );
    }

    if (currentProgram.cluster === parsed.data.network) {
      await database.store.setOrganizationMonitorName(
        project.id,
        currentProgram.id,
        parsed.data.name,
      );
      return Response.json({
        data: { displayName: parsed.data.name, program: currentProgram },
      });
    }

    const rpcUrl = rpcUrlForCluster(parsed.data.network);
    const result = await new ProgramIngestionService(
      solanaGatewayForCluster(parsed.data.network),
      database.store,
      undefined,
      new ProgramMetadataIntelligenceClient(rpcUrl),
    ).ingest({
      address: currentProgram.address,
      cluster: parsed.data.network,
      organizationId: project.id,
    });
    await database.store.setOrganizationMonitorName(
      project.id,
      result.program.id,
      parsed.data.name,
    );
    await database.store.removeOrganizationMonitor(
      project.id,
      currentProgram.id,
    );

    return Response.json({
      data: {
        createdBaseline: result.createdBaseline,
        displayName: parsed.data.name,
        program: result.program,
        snapshot: serializeSnapshot(result.snapshot),
      },
    });
  } catch (error) {
    if (error instanceof UseKratoseError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.code === "RPC_ERROR" ? 502 : 422 },
      );
    }
    console.error("Dashboard program update failed", { error });
    return Response.json(
      {
        error: { code: "INTERNAL_ERROR", message: "Failed to update program" },
      },
      { status: 500 },
    );
  } finally {
    await database.close();
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await authenticateDashboardRequest(request);
  if (user === null) return dashboardUnauthorized();

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
    const project = await database.store.getProjectForUser(user.id);
    if (project === null) {
      return Response.json(
        {
          error: {
            code: "ONBOARDING_REQUIRED",
            message: "Create a workspace first",
          },
        },
        { status: 409 },
      );
    }
    const { programId } = await context.params;
    const program = await database.store.getProgramByIdentifier(
      programId,
      project.id,
    );
    if (program === null) {
      return Response.json(
        {
          error: { code: "NOT_FOUND", message: "Monitored program not found" },
        },
        { status: 404 },
      );
    }
    await database.store.removeOrganizationMonitor(project.id, program.id);
    return new Response(null, { status: 204 });
  } finally {
    await database.close();
  }
}
