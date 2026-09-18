import { createPostgresStore } from "@usekratose/database";
import { SolanaRpcClient } from "@usekratose/solana";

import { loadConfig } from "./config.js";
import { MonitorCoordinator } from "./coordinator.js";

const config = loadConfig();
const database = createPostgresStore(config.DATABASE_URL);
const coordinator = new MonitorCoordinator({
  cluster: config.SOLANA_CLUSTER,
  gateway: new SolanaRpcClient(config.SOLANA_RPC_HTTP_URL),
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
