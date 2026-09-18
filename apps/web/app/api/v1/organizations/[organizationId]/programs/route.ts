import { ProgramIngestionService } from "@usekratose/application";
import { UseKratoseError } from "@usekratose/core";
import { createPostgresStore } from "@usekratose/database";
import { SolanaRpcClient } from "@usekratose/solana";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  address: z.string().min(32).max(44),
  cluster: z.enum(["devnet", "mainnet-beta"]),
});

function rpcUrlForCluster(cluster: "devnet" | "mainnet-beta"): string {
  if (cluster === "devnet") {
    return (
      process.env.SOLANA_DEVNET_RPC_HTTP_URL ?? "https://api.devnet.solana.com"
    );
  }

  const endpoint = process.env.SOLANA_MAINNET_RPC_HTTP_URL;
  if (endpoint === undefined) {
    throw new Error(
      "SOLANA_MAINNET_RPC_HTTP_URL is required for mainnet monitoring",
    );
  }
  return endpoint;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
): Promise<Response> {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined) {
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
  const database = createPostgresStore(databaseUrl);
  try {
    const service = new ProgramIngestionService(
      new SolanaRpcClient(rpcUrlForCluster(parsed.data.cluster)),
      database.store,
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
