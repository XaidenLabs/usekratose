import { createPostgresStore } from "@usekratose/database";
import { AlertDispatcher, FetchWebhookTransport } from "@usekratose/alerts";
import {
  ExplanationService,
  OpenAiExplanationProvider,
} from "@usekratose/explanations";
import {
  ProgramMetadataIntelligenceClient,
  SolanaRpcClient,
} from "@usekratose/solana";

import { loadConfig } from "./config.js";
import { MonitorCoordinator } from "./coordinator.js";

const config = loadConfig();
const database = createPostgresStore(config.DATABASE_URL);
const alerts =
  config.ALERT_SECRET_ENCRYPTION_KEY === ""
    ? undefined
    : new AlertDispatcher(
        database.store,
        new FetchWebhookTransport(),
        config.ALERT_SECRET_ENCRYPTION_KEY,
      );
const explanations =
  config.OPENAI_API_KEY === ""
    ? undefined
    : new ExplanationService(
        database.store,
        new OpenAiExplanationProvider(
          config.OPENAI_API_KEY,
          config.AI_EXPLANATION_MODEL,
        ),
      );
const coordinator = new MonitorCoordinator({
  alertDeliveryIntervalMs: config.ALERT_DELIVERY_INTERVAL_MS,
  ...(alerts === undefined ? {} : { alerts }),
  explanationIntervalMs: config.AI_EXPLANATION_INTERVAL_MS,
  ...(explanations === undefined ? {} : { explanations }),
  cluster: config.SOLANA_CLUSTER,
  gateway: new SolanaRpcClient(config.SOLANA_RPC_HTTP_URL),
  intelligence: new ProgramMetadataIntelligenceClient(
    config.SOLANA_RPC_HTTP_URL,
    {
      allowedUrlHosts: config.PROGRAM_METADATA_URL_HOST_ALLOWLIST.split(",")
        .map((host) => host.trim())
        .filter((host) => host !== ""),
    },
  ),
  portfolioRefreshIntervalMs: config.PORTFOLIO_REFRESH_INTERVAL_MS,
  reconciliationIntervalMs: config.RECONCILIATION_INTERVAL_MS,
  reconnectBaseDelayMs: config.WS_RECONNECT_BASE_DELAY_MS,
  store: database.store,
  websocketEndpoint: config.SOLANA_RPC_WS_URL,
});

async function shutdown(signal: string): Promise<void> {
  console.info("Stopping monitor worker", { signal });
  coordinator.stop();
  await database.close();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

await coordinator.start();
console.info("UseKratose monitor worker started");
