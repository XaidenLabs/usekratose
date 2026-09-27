import { createPostgresStore } from "@usekratose/database";
import { AlertDispatcher, FetchWebhookTransport } from "@usekratose/alerts";
import {
  ExplanationService,
  OllamaExplanationProvider,
  OpenAiExplanationProvider,
} from "@usekratose/explanations";
import {
  FailoverSolanaGateway,
  ProgramMetadataIntelligenceClient,
  SolanaRpcClient,
  solamiRpcEndpoint,
  solamiWebSocketEndpoint,
  type SolanaRpcProvider,
  type WebSocketProvider,
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
const explanationProvider =
  config.AI_EXPLANATION_PROVIDER === "ollama"
    ? new OllamaExplanationProvider(
        config.AI_EXPLANATION_MODEL,
        config.OLLAMA_BASE_URL,
      )
    : config.AI_EXPLANATION_PROVIDER === "openai"
      ? new OpenAiExplanationProvider(
          config.OPENAI_API_KEY,
          config.AI_EXPLANATION_MODEL,
        )
      : undefined;
const explanations =
  explanationProvider === undefined
    ? undefined
    : new ExplanationService(database.store, explanationProvider);
const useSolami =
  config.SOLANA_CLUSTER === "mainnet-beta" && config.SOLAMI_API_KEY !== "";
const useSolamiWebSocket = useSolami && config.SOLAMI_RPC_WS_URL !== "";
const rpcProviders: SolanaRpcProvider[] = [
  ...(useSolami
    ? [
        {
          gateway: new SolanaRpcClient(
            solamiRpcEndpoint(config.SOLAMI_API_KEY, config.SOLAMI_RPC_URL),
          ),
          name: "solami",
        },
      ]
    : []),
  {
    gateway: new SolanaRpcClient(config.SOLANA_RPC_HTTP_URL),
    name: useSolami ? "fallback" : "configured",
  },
];
const rpcGateway = new FailoverSolanaGateway(rpcProviders, {
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
const intelligenceRpcUrl = useSolami
  ? solamiRpcEndpoint(config.SOLAMI_API_KEY, config.SOLAMI_RPC_URL)
  : config.SOLANA_RPC_HTTP_URL;
const websocketProviders: readonly WebSocketProvider[] = useSolamiWebSocket
  ? [
      {
        endpoint: solamiWebSocketEndpoint(
          config.SOLAMI_API_KEY,
          config.SOLAMI_RPC_WS_URL,
        ),
        name: "solami",
      },
      { endpoint: config.SOLANA_RPC_WS_URL, name: "fallback" },
    ]
  : [{ endpoint: config.SOLANA_RPC_WS_URL, name: "configured" }];
const [primaryWebsocket, ...fallbackWebsockets] = websocketProviders;
if (primaryWebsocket === undefined) {
  throw new Error("At least one WebSocket provider is required");
}
const coordinator = new MonitorCoordinator({
  alertDeliveryIntervalMs: config.ALERT_DELIVERY_INTERVAL_MS,
  ...(alerts === undefined ? {} : { alerts }),
  explanationIntervalMs: config.AI_EXPLANATION_INTERVAL_MS,
  ...(explanations === undefined ? {} : { explanations }),
  cluster: config.SOLANA_CLUSTER,
  gateway: rpcGateway,
  intelligence: new ProgramMetadataIntelligenceClient(intelligenceRpcUrl, {
    allowedUrlHosts: config.PROGRAM_METADATA_URL_HOST_ALLOWLIST.split(",")
      .map((host) => host.trim())
      .filter((host) => host !== ""),
  }),
  portfolioRefreshIntervalMs: config.PORTFOLIO_REFRESH_INTERVAL_MS,
  reconciliationIntervalMs: config.RECONCILIATION_INTERVAL_MS,
  reconnectBaseDelayMs: config.WS_RECONNECT_BASE_DELAY_MS,
  store: database.store,
  websocketEndpoint: primaryWebsocket.endpoint,
  websocketFallbackProviders: fallbackWebsockets,
  websocketProviderName: primaryWebsocket.name,
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
console.info("UseKratose monitor worker started", {
  cluster: config.SOLANA_CLUSTER,
  rpcProviders: rpcProviders.map((provider) => provider.name),
  websocketProviders: websocketProviders.map((provider) => provider.name),
});
