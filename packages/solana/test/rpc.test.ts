import { describe, expect, it } from "vitest";

import { SolanaRpcClient } from "../src/rpc.js";

function response(input: {
  readonly data?: string;
  readonly slot?: number;
}): Response {
  return Response.json({
    jsonrpc: "2.0",
    result: {
      context: { slot: input.slot ?? 123 },
      value: {
        data: [input.data ?? "AQID", "base64"],
        executable: true,
        lamports: 1,
        owner: "BPFLoaderUpgradeab1e11111111111111111111111",
      },
    },
  });
}

describe("SolanaRpcClient", () => {
  it("decodes validated account bytes", async () => {
    const client = new SolanaRpcClient("https://rpc.example.com", async () =>
      response({}),
    );

    const result = await client.getAccountInfo("program");
    expect(result.contextSlot).toBe(123n);
    expect(Array.from(result.account?.data ?? [])).toEqual([1, 2, 3]);
  });

  it("rejects malformed base64 account data", async () => {
    const client = new SolanaRpcClient("https://rpc.example.com", async () =>
      response({ data: "not-base64***" }),
    );

    await expect(client.getAccountInfo("program")).rejects.toThrow(
      "invalid base64",
    );
  });

  it("rejects unsafe numeric slots instead of rounding them", async () => {
    const client = new SolanaRpcClient("https://rpc.example.com", async () =>
      response({ slot: Number.MAX_SAFE_INTEGER + 1 }),
    );

    await expect(client.getAccountInfo("program")).rejects.toThrow(
      "invalid getAccountInfo response",
    );
  });
});
