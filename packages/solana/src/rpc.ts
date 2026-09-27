import type { AccountRead } from "@usekratose/core";
import type { SolanaGateway } from "@usekratose/application";
import { UseKratoseError } from "@usekratose/core";
import { z } from "zod";

const accountSchema = z.object({
  data: z.tuple([z.string(), z.literal("base64")]),
  executable: z.boolean(),
  lamports: z.number().int().nonnegative().safe(),
  owner: z.string(),
});

const responseSchema = z.object({
  error: z.object({ code: z.number(), message: z.string() }).optional(),
  result: z
    .object({
      context: z.object({ slot: z.number().int().nonnegative().safe() }),
      value: accountSchema.nullable(),
    })
    .optional(),
});

export class SolanaRpcClient implements SolanaGateway {
  private requestId = 0;

  public constructor(
    private readonly endpoint: string,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  public async getAccountInfo(address: string): Promise<AccountRead> {
    const response = await this.fetchImplementation(this.endpoint, {
      body: JSON.stringify({
        id: ++this.requestId,
        jsonrpc: "2.0",
        method: "getAccountInfo",
        params: [address, { commitment: "finalized", encoding: "base64" }],
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new UseKratoseError(
        "RPC_ERROR",
        `Solana RPC returned HTTP ${response.status}`,
      );
    }

    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new UseKratoseError(
        "RPC_ERROR",
        "Solana RPC returned an invalid getAccountInfo response",
        { cause: parsed.error },
      );
    }
    if (parsed.data.error !== undefined) {
      throw new UseKratoseError(
        "RPC_ERROR",
        `Solana RPC ${parsed.data.error.code}: ${parsed.data.error.message}`,
      );
    }
    if (parsed.data.result === undefined) {
      throw new UseKratoseError(
        "RPC_ERROR",
        "Solana RPC response did not include a result",
      );
    }

    const account = parsed.data.result.value;
    const data = account === null ? null : decodeBase64(account.data[0]);
    return {
      account:
        account === null
          ? null
          : {
              data: data ?? new Uint8Array(),
              executable: account.executable,
              lamports: BigInt(account.lamports),
              owner: account.owner,
            },
      contextSlot: BigInt(parsed.data.result.context.slot),
    };
  }
}

function decodeBase64(value: string): Uint8Array {
  const unpadded = value.replace(/=+$/, "");
  if (
    value.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value) ||
    value.slice(0, -2).includes("=")
  ) {
    throw new UseKratoseError(
      "RPC_ERROR",
      "Solana RPC returned invalid base64 account data",
    );
  }
  const decoded = Buffer.from(value, "base64");
  if (decoded.toString("base64").replace(/=+$/, "") !== unpadded) {
    throw new UseKratoseError(
      "RPC_ERROR",
      "Solana RPC returned invalid base64 account data",
    );
  }
  return decoded;
}
