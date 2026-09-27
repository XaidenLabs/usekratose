import { z } from "zod";

import { loadLocalEnvironment } from "./load-local-environment.js";

const schema = z.object({
  ALERT_DELIVERY_INTERVAL_MS: z.coerce.number().int().min(1_000).default(5_000),
  ALERT_SECRET_ENCRYPTION_KEY: z.string().default(""),
  AI_EXPLANATION_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(10_000)
    .default(60_000),
  AI_EXPLANATION_MODEL: z.string().default("qwen3:4b-instruct"),
  AI_EXPLANATION_PROVIDER: z
    .enum(["disabled", "ollama", "openai"])
    .default("ollama"),
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  OPENAI_API_KEY: z.string().default(""),
  DATABASE_URL: z.preprocess(
    (value) => value ?? process.env.SUPABASE_DATABASE_URL,
    z.string().url(),
  ),
  PORTFOLIO_REFRESH_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(5_000)
    .default(60_000),
  PROGRAM_METADATA_URL_HOST_ALLOWLIST: z.string().default(""),
  RECONCILIATION_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(10_000)
    .default(300_000),
  SOLAMI_API_KEY: z.string().default(""),
  SOLAMI_RPC_URL: z.string().url().default("https://rpc.solami.dev/sol"),
  SOLAMI_RPC_WS_URL: z.union([z.literal(""), z.string().url()]).default(""),
  SOLANA_CLUSTER: z.enum(["devnet", "mainnet-beta"]),
  SOLANA_RPC_HTTP_URL: z.string().url(),
  SOLANA_RPC_WS_URL: z.string().url(),
  WS_RECONNECT_BASE_DELAY_MS: z.coerce.number().int().min(100).default(1_000),
});

export type MonitorConfig = z.infer<typeof schema>;

export function loadConfig(): MonitorConfig {
  loadLocalEnvironment();
  const config = schema.parse(process.env);
  if (
    config.AI_EXPLANATION_PROVIDER === "openai" &&
    config.OPENAI_API_KEY === ""
  ) {
    throw new Error(
      "OPENAI_API_KEY is required when AI_EXPLANATION_PROVIDER=openai",
    );
  }
  return config;
}
