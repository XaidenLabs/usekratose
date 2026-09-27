import { afterEach, describe, expect, it, vi } from "vitest";

import { rpcProvidersForCluster } from "../lib/solana-rpc.js";

describe("cluster RPC routing", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses Solami first and a separate fallback for mainnet", () => {
    vi.stubEnv("SOLANA_CLUSTER", "devnet");
    vi.stubEnv("SOLANA_RPC_HTTP_URL", "https://devnet.example");
    vi.stubEnv(
      "SOLANA_MAINNET_RPC_HTTP_URL",
      "https://mainnet-fallback.example",
    );
    vi.stubEnv("SOLAMI_API_KEY", "secret");
    vi.stubEnv("SOLAMI_RPC_URL", "https://rpc.solami.dev/sol");

    const providers = rpcProvidersForCluster("mainnet-beta");

    expect(providers.map(({ name }) => name)).toEqual(["solami", "fallback"]);
    expect(providers[0]?.url).toBe("https://rpc.solami.dev/sol?api_key=secret");
    expect(providers[1]?.url).toBe("https://mainnet-fallback.example/");
  });

  it("never sends devnet reads to the mainnet-only Solami endpoint", () => {
    vi.stubEnv("SOLANA_CLUSTER", "devnet");
    vi.stubEnv("SOLANA_RPC_HTTP_URL", "https://devnet.example");
    vi.stubEnv("SOLAMI_API_KEY", "secret");

    expect(rpcProvidersForCluster("devnet")).toEqual([
      { name: "configured", url: "https://devnet.example/" },
    ]);
  });
});
