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

const bodySchema = z.object({
  address: z.string().trim().min(32).max(44),
  name: z.string().trim().min(1).max(80),
  network: z.enum(["devnet", "mainnet-beta"]),
});

export async function POST(request: Request): Promise<Response> {
  const user = await authenticateDashboardRequest(request);
  if (user === null) return dashboardUnauthorized();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "Valid name, program address, and network required",
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
    const rpcUrl = rpcUrlForCluster(parsed.data.network);
    const result = await new ProgramIngestionService(
      solanaGatewayForCluster(parsed.data.network),
      database.store,
      undefined,
      new ProgramMetadataIntelligenceClient(rpcUrl),
    ).ingest({
      address: parsed.data.address,
      cluster: parsed.data.network,
      organizationId: project.id,
    });
    await database.store.setOrganizationMonitorName(
      project.id,
      result.program.id,
      parsed.data.name,
    );
    return Response.json(
      {
        data: {
          createdBaseline: result.createdBaseline,
          displayName: parsed.data.name,
          program: result.program,
          snapshot: serializeSnapshot(result.snapshot),
        },
      },
      { status: result.createdBaseline ? 201 : 200 },
    );
  } catch (error) {
    if (error instanceof UseKratoseError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.code === "RPC_ERROR" ? 502 : 422 },
      );
    }
    console.error("Dashboard program ingestion failed", { error });
    return Response.json(
      {
        error: { code: "INTERNAL_ERROR", message: "Failed to monitor program" },
      },
      { status: 500 },
    );
  } finally {
    await database.close();
  }
}
