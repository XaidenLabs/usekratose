import type { Cluster } from "@usekratose/core";
import {
  FailoverSolanaGateway,
  SolanaRpcClient,
  solamiRpcEndpoint,
  type SolanaRpcProvider,
} from "@usekratose/solana";

const publicRpcUrls: Readonly<Record<Cluster, string>> = {
  devnet: "https://api.devnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
};

const supportedClusters = ["devnet", "mainnet-beta"] as const;

export function configuredDefaultCluster(): Cluster {
  const cluster = process.env.SOLANA_CLUSTER;
  if (supportedClusters.some((candidate) => candidate === cluster)) {
    return cluster as Cluster;
  }
  throw new Error("SOLANA_CLUSTER must be devnet or mainnet-beta");
}

export function rpcUrlForCluster(cluster: Cluster): string {
  return rpcProvidersForCluster(cluster)[0]?.url ?? publicRpcUrls[cluster];
}

export function solanaGatewayForCluster(
  cluster: Cluster,
): FailoverSolanaGateway {
  const providers: SolanaRpcProvider[] = rpcProvidersForCluster(cluster).map(
    ({ name, url }) => ({ gateway: new SolanaRpcClient(url), name }),
  );
  return new FailoverSolanaGateway(providers, {
    onAttempt: ({ durationMs, error, provider, status }) => {
      if (status === "failed") {
        console.warn("Solana RPC provider failed", {
          durationMs: Math.round(durationMs),
          error: error?.message,
          provider,
        });
      }
    },
  });
}

export function rpcProvidersForCluster(
  cluster: Cluster,
): readonly { readonly name: string; readonly url: string }[] {
  const defaultCluster = configuredDefaultCluster();
  const configuredFallback =
    cluster === defaultCluster
      ? process.env.SOLANA_RPC_HTTP_URL
      : cluster === "devnet"
        ? process.env.SOLANA_DEVNET_RPC_HTTP_URL
        : process.env.SOLANA_MAINNET_RPC_HTTP_URL;
  const fallbackUrl = new URL(
    configuredFallback?.trim() || publicRpcUrls[cluster],
  ).toString();
  const providers: { name: string; url: string }[] = [];

  const solamiApiKey = process.env.SOLAMI_API_KEY?.trim();
  if (cluster === "mainnet-beta" && solamiApiKey) {
    providers.push({
      name: "solami",
      url: solamiRpcEndpoint(
        solamiApiKey,
        process.env.SOLAMI_RPC_URL?.trim() || undefined,
      ),
    });
  }
  if (!providers.some((provider) => provider.url === fallbackUrl)) {
    providers.push({
      name: providers.length === 0 ? "configured" : "fallback",
      url: fallbackUrl,
    });
  }
  return providers;
}
