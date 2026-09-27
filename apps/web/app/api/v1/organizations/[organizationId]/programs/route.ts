import { ProgramIngestionService } from "@usekratose/application";
import { UseKratoseError } from "@usekratose/core";
import { ProgramMetadataIntelligenceClient } from "@usekratose/solana";
import { z } from "zod";

import { createServerDatabase } from "@/lib/database";
import { hasControlPlaneAccess } from "@/lib/api-server";
import { rpcUrlForCluster, solanaGatewayForCluster } from "@/lib/solana-rpc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  address: z.string().min(32).max(44),
  cluster: z.enum(["devnet", "mainnet-beta"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
): Promise<Response> {
  if (!hasControlPlaneAccess(request)) {
    return Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  const database = createServerDatabase();
  if (database === null) {
    return Response.json(
      {
        error: {
          code: "CONFIGURATION_ERROR",
          message: "Database is not configured",
        },
      },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: { code: "INVALID_REQUEST", issues: parsed.error.issues } },
      { status: 400 },
    );
  }

  const { organizationId } = await context.params;
  try {
    const rpcUrl = rpcUrlForCluster(parsed.data.cluster);
    const service = new ProgramIngestionService(
      solanaGatewayForCluster(parsed.data.cluster),
      database.store,
      undefined,
      new ProgramMetadataIntelligenceClient(rpcUrl),
    );
    const result = await service.ingest({
      ...parsed.data,
      organizationId,
    });

    return Response.json(
      {
        createdBaseline: result.createdBaseline,
        program: result.program,
        snapshot: {
          ...result.snapshot,
          deploymentSlot: result.snapshot.deploymentSlot.toString(),
          observedSlot: result.snapshot.observedSlot.toString(),
        },
      },
      { status: result.createdBaseline ? 201 : 200 },
    );
  } catch (error) {
    if (error instanceof UseKratoseError) {
      const status = error.code === "RPC_ERROR" ? 502 : 422;
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status },
      );
    }
    console.error("Program ingestion failed", error);
    return Response.json(
      {
        error: { code: "INTERNAL_ERROR", message: "Program ingestion failed" },
      },
      { status: 500 },
    );
  } finally {
    await database.close();
  }
}
