import {
  ProgramIngestionService,
  ProgramReconciliationService,
} from "@usekratose/application";
import { createPostgresStore } from "@usekratose/database";
import {
  ProgramMetadataIntelligenceClient,
  SolanaRpcClient,
  SolanaWebSocketMonitor,
} from "@usekratose/solana";

import { loadConfig } from "./config.js";

const programAddress = process.argv
  .slice(2)
  .find((argument) => argument !== "--" && !argument.startsWith("--"));
if (programAddress === undefined) {
  throw new Error(
    "Usage: pnpm --filter @usekratose/monitor proof:upgrade <PROGRAM_ID>",
  );
}
const pollingOnly = process.argv.includes("--polling-only");

const config = loadConfig();
if (config.SOLANA_CLUSTER !== "devnet") {
  throw new Error("The Milestone 1 upgrade proof is restricted to devnet");
}
const database = createPostgresStore(config.DATABASE_URL);
const gateway = new SolanaRpcClient(config.SOLANA_RPC_HTTP_URL);
const intelligence = new ProgramMetadataIntelligenceClient(
  config.SOLANA_RPC_HTTP_URL,
);
const ingestion = new ProgramIngestionService(
  gateway,
  database.store,
  undefined,
  intelligence,
);
const reconciliation = new ProgramReconciliationService(
  gateway,
  database.store,
  undefined,
  intelligence,
);
const baseline = await ingestion.ingest({
  address: programAddress,
  cluster: "devnet",
  organizationId: "milestone-1-proof",
});

console.log(
  JSON.stringify({
    detectionMode: pollingOnly ? "polling-only" : "websocket-and-polling",
    message: pollingOnly
      ? "Baseline ready with WebSocket monitoring disabled. Upgrade this exact Program ID now."
      : "Baseline ready. Upgrade this exact Program ID now.",
    programDataAddress: baseline.program.programDataAddress,
    baselineFingerprint: baseline.snapshot.fingerprint,
    executableHash: baseline.snapshot.executableHash,
  }),
);

let completed = false;
let pollTimer: NodeJS.Timeout | null = null;
let monitor: SolanaWebSocketMonitor | null = null;
const detect = async (reason: "poll" | "websocket"): Promise<void> => {
  if (completed) return;
  const result = await reconciliation.reconcile(baseline.program.id, reason);
  if (result.kind !== "change") return;
  completed = true;
  console.log(
    JSON.stringify({
      events: result.events,
      message: pollingOnly
        ? "UPGRADE_RECOVERED_BY_POLLING_DETERMINISTICALLY"
        : "UPGRADE_DETECTED_DETERMINISTICALLY",
      reason,
      snapshot: {
        ...result.snapshot,
        deploymentSlot: result.snapshot.deploymentSlot.toString(),
        observedSlot: result.snapshot.observedSlot.toString(),
      },
    }),
  );
  monitor?.stop();
  if (pollTimer !== null) clearInterval(pollTimer);
  await database.close();
};

let detectionQueue = Promise.resolve();
const scheduleDetection = (reason: "poll" | "websocket"): void => {
  detectionQueue = detectionQueue
    .then(() => detect(reason))
    .catch((error: unknown) => {
      console.error("Upgrade proof reconciliation failed", { error, reason });
    });
};

if (!pollingOnly) {
  monitor = new SolanaWebSocketMonitor({
    endpoint: config.SOLANA_RPC_WS_URL,
    onAccountChange: () => scheduleDetection("websocket"),
    onHealthChange: ({ state }) => console.info("WebSocket", state),
    reconnectBaseDelayMs: config.WS_RECONNECT_BASE_DELAY_MS,
  });
  monitor.watch(baseline.program.programDataAddress);
  monitor.start();
}
pollTimer = setInterval(() => scheduleDetection("poll"), 10_000);
