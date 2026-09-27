import type { AccountRead } from "@usekratose/core";
import type { SolanaGateway } from "@usekratose/application";
import { describe, expect, it, vi } from "vitest";

import { FailoverSolanaGateway } from "../src/failover.js";
import { solamiRpcEndpoint, solamiWebSocketEndpoint } from "../src/solami.js";

const accountRead: AccountRead = { account: null, contextSlot: 42n };

function gateway(result: AccountRead | Error): SolanaGateway {
  return {
    getAccountInfo: vi.fn(async () => {
      if (result instanceof Error) throw result;
      return result;
    }),
  };
}

describe("FailoverSolanaGateway", () => {
  it("uses the primary provider when it succeeds", async () => {
    const primary = gateway(accountRead);
    const fallback = gateway(new Error("must not run"));
    const client = new FailoverSolanaGateway([
      { gateway: primary, name: "solami" },
      { gateway: fallback, name: "fallback" },
    ]);

    await expect(client.getAccountInfo("program")).resolves.toEqual(
      accountRead,
    );
    expect(primary.getAccountInfo).toHaveBeenCalledOnce();
    expect(fallback.getAccountInfo).not.toHaveBeenCalled();
  });

  it("uses the fallback provider after a primary failure", async () => {
    const attempts: string[] = [];
    const client = new FailoverSolanaGateway(
      [
        { gateway: gateway(new Error("primary unavailable")), name: "solami" },
        { gateway: gateway(accountRead), name: "fallback" },
      ],
      {
        onAttempt: ({ provider, status }) =>
          attempts.push(`${provider}:${status}`),
      },
    );

    await expect(client.getAccountInfo("program")).resolves.toEqual(
      accountRead,
    );
    expect(attempts).toEqual(["solami:failed", "fallback:succeeded"]);
  });

  it("reports a deterministic error when every provider fails", async () => {
    const client = new FailoverSolanaGateway([
      { gateway: gateway(new Error("primary unavailable")), name: "solami" },
      { gateway: gateway(new Error("fallback unavailable")), name: "fallback" },
    ]);

    await expect(client.getAccountInfo("program")).rejects.toThrow(
      "All Solana RPC providers failed",
    );
  });
});

describe("Solami endpoints", () => {
  it("adds the API key without discarding existing query parameters", () => {
    expect(
      solamiRpcEndpoint("secret", "https://rpc.example/sol?region=ams"),
    ).toBe("https://rpc.example/sol?region=ams&api_key=secret");
    expect(solamiWebSocketEndpoint("secret")).toBe(
      "wss://rpc.solami.dev/ws/sol?api_key=secret",
    );
  });
});
