import { ProgramIngestionService } from "@usekratose/application";
import { UseKratoseError } from "@usekratose/core";
import { ProgramMetadataIntelligenceClient } from "@usekratose/solana";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { createServerDatabase } from "@/lib/database";
import { serializeSnapshot } from "@/lib/serialize";
import { rpcUrlForCluster, solanaGatewayForCluster } from "@/lib/solana-rpc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  address: z.string().trim().min(32).max(44),
  network: z.enum(["devnet", "mainnet-beta"]),
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
      {
        error: { message: "A valid program address and network are required" },
      },
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
    const project = await database.store.getProjectForUser(session.id);
    if (project === null) {
      return Response.json(
        { error: { message: "Complete project onboarding first" } },
        { status: 409 },
      );
    }

    const rpcUrl = rpcUrlForCluster(parsed.data.network);
    const service = new ProgramIngestionService(
      solanaGatewayForCluster(parsed.data.network),
      database.store,
      undefined,
      new ProgramMetadataIntelligenceClient(rpcUrl),
    );
    const result = await service.ingest({
      address: parsed.data.address,
      cluster: parsed.data.network,
      organizationId: project.id,
    });
    return Response.json(
      {
        createdBaseline: result.createdBaseline,
        program: result.program,
        snapshot: serializeSnapshot(result.snapshot),
      },
      { status: result.createdBaseline ? 201 : 200 },
    );
  } catch (error) {
    if (error instanceof UseKratoseError) {
      return Response.json(
        { error: { message: error.message } },
        { status: error.code === "RPC_ERROR" ? 502 : 422 },
      );
    }
    console.error("Failed to monitor program", { error });
    return Response.json(
      { error: { message: "Failed to start monitoring" } },
      { status: 500 },
    );
  } finally {
    await database.close();
  }
}
