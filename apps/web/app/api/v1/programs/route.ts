import { ProgramIngestionService } from "@usekratose/application";
import { UseKratoseError } from "@usekratose/core";
import { ProgramMetadataIntelligenceClient } from "@usekratose/solana";
import { z } from "zod";

import { withApiAuth } from "@/lib/api-server";
import { serializeSnapshot } from "@/lib/serialize";
import { rpcUrlForCluster, solanaGatewayForCluster } from "@/lib/solana-rpc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  address: z.string().min(32).max(44),
  network: z.enum(["devnet", "mainnet-beta"]),
});

export async function GET(request: Request): Promise<Response> {
  return withApiAuth(request, async ({ key, store }) => {
    const programs = await store.listProgramsForProject(key.projectId);
    return Response.json({ data: programs });
  });
}

export async function POST(request: Request): Promise<Response> {
  return withApiAuth(request, async ({ key, store }) => {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: { code: "INVALID_REQUEST", issues: parsed.error.issues } },
        { status: 400 },
      );
    }
    try {
      const rpcUrl = rpcUrlForCluster(parsed.data.network);
      const service = new ProgramIngestionService(
        solanaGatewayForCluster(parsed.data.network),
        store,
        undefined,
        new ProgramMetadataIntelligenceClient(rpcUrl),
      );
      const result = await service.ingest({
        address: parsed.data.address,
        cluster: parsed.data.network,
        organizationId: key.projectId,
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
          { error: { code: error.code, message: error.message } },
          { status: error.code === "RPC_ERROR" ? 502 : 422 },
        );
      }
      throw error;
    }
  });
}
