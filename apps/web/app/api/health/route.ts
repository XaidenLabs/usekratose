import { rpcProvidersForCluster } from "@/lib/solana-rpc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(): Response {
  const databaseConfigured =
    process.env.SUPABASE_DATABASE_URL !== undefined ||
    process.env.DATABASE_URL !== undefined;
  return Response.json({
    configuration: {
      database: databaseConfigured,
      rpc: {
        devnet: rpcProvidersForCluster("devnet").map(({ name }) => name),
        mainnet: rpcProvidersForCluster("mainnet-beta").map(({ name }) => name),
      },
      solami: Boolean(process.env.SOLAMI_API_KEY?.trim()),
      solamiWebSocket: Boolean(process.env.SOLAMI_RPC_WS_URL?.trim()),
      supabasePublic:
        process.env.NEXT_PUBLIC_SUPABASE_URL !== undefined &&
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== undefined,
    },
    release: {
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
      milestone: process.env.RELEASE_MILESTONE ?? null,
      service: process.env.SERVICE_NAME ?? null,
    },
    status: databaseConfigured ? "ready" : "degraded",
  });
}
