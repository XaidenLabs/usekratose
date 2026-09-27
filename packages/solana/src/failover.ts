import type { AccountRead } from "@usekratose/core";
import type { SolanaGateway } from "@usekratose/application";
import { UseKratoseError } from "@usekratose/core";

export interface SolanaRpcProvider {
  readonly gateway: SolanaGateway;
  readonly name: string;
}

export interface SolanaRpcAttempt {
  readonly durationMs: number;
  readonly error?: Error;
  readonly provider: string;
  readonly status: "failed" | "succeeded";
}

export interface FailoverSolanaGatewayOptions {
  readonly onAttempt?: (attempt: SolanaRpcAttempt) => void;
}

export class FailoverSolanaGateway implements SolanaGateway {
  public constructor(
    private readonly providers: readonly SolanaRpcProvider[],
    private readonly options: FailoverSolanaGatewayOptions = {},
  ) {
    if (providers.length === 0) {
      throw new Error("At least one Solana RPC provider is required");
    }
  }

  public async getAccountInfo(address: string): Promise<AccountRead> {
    const failures: string[] = [];
    for (const provider of this.providers) {
      const startedAt = performance.now();
      try {
        const result = await provider.gateway.getAccountInfo(address);
        this.options.onAttempt?.({
          durationMs: performance.now() - startedAt,
          provider: provider.name,
          status: "succeeded",
        });
        return result;
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error(String(cause));
        failures.push(`${provider.name}: ${error.message}`);
        this.options.onAttempt?.({
          durationMs: performance.now() - startedAt,
          error,
          provider: provider.name,
          status: "failed",
        });
      }
    }

    throw new UseKratoseError(
      "RPC_ERROR",
      `All Solana RPC providers failed (${failures.join("; ")})`,
    );
  }
}
