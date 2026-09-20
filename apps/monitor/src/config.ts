import { z } from "zod";

const schema = z.object({
  ALERT_DELIVERY_INTERVAL_MS: z.coerce.number().int().min(1_000).default(5_000),
  ALERT_SECRET_ENCRYPTION_KEY: z.string().default(""),
  AI_EXPLANATION_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(10_000)
    .default(60_000),
  AI_EXPLANATION_MODEL: z.string().default("gpt-5-mini"),
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
  SOLANA_CLUSTER: z.enum(["devnet", "mainnet-beta"]),
  SOLANA_RPC_HTTP_URL: z.string().url(),
  SOLANA_RPC_WS_URL: z.string().url(),
  WS_RECONNECT_BASE_DELAY_MS: z.coerce.number().int().min(100).default(1_000),
});

export type MonitorConfig = z.infer<typeof schema>;

export function loadConfig(): MonitorConfig {
  return schema.parse(process.env);
}
