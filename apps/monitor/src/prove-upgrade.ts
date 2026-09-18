import {
  ProgramIngestionService,
  ProgramReconciliationService,
} from "@usekratose/application";
import { createPostgresStore } from "@usekratose/database";
import { SolanaRpcClient, SolanaWebSocketMonitor } from "@usekratose/solana";

import { loadConfig } from "./config.js";

const programAddress = process.argv[2];
if (programAddress === undefined) {
  throw new Error(
    "Usage: pnpm --filter @usekratose/monitor proof:upgrade <PROGRAM_ID>",
  );
}

const config = loadConfig();
if (config.SOLANA_CLUSTER !== "devnet") {
  throw new Error("The Milestone 1 upgrade proof is restricted to devnet");
}
const database = createPostgresStore(config.DATABASE_URL);
const gateway = new SolanaRpcClient(config.SOLANA_RPC_HTTP_URL);
const ingestion = new ProgramIngestionService(gateway, database.store);
const reconciliation = new ProgramReconciliationService(
  gateway,
  database.store,
);
const baseline = await ingestion.ingest({
  address: programAddress,
  cluster: "devnet",
  organizationId: "milestone-1-proof",
});

console.log(
  JSON.stringify({
    message: "Baseline ready. Upgrade this exact Program ID now.",
    programDataAddress: baseline.program.programDataAddress,
    baselineFingerprint: baseline.snapshot.fingerprint,
    executableHash: baseline.snapshot.executableHash,
  }),
);

let completed = false;
const detect = async (reason: "poll" | "websocket"): Promise<void> => {
  if (completed) return;
  const result = await reconciliation.reconcile(baseline.program.id, reason);
  if (result.kind !== "change") return;
  completed = true;
  console.log(
    JSON.stringify({
      events: result.events,
      message: "UPGRADE_DETECTED_DETERMINISTICALLY",
      snapshot: {
        ...result.snapshot,
        deploymentSlot: result.snapshot.deploymentSlot.toString(),
        observedSlot: result.snapshot.observedSlot.toString(),
      },
    }),
  );
  monitor.stop();
  clearInterval(pollTimer);
  await database.close();
};

const monitor = new SolanaWebSocketMonitor({
  endpoint: config.SOLANA_RPC_WS_URL,
  onAccountChange: () => void detect("websocket"),
  onHealthChange: ({ state }) => console.info("WebSocket", state),
  reconnectBaseDelayMs: config.WS_RECONNECT_BASE_DELAY_MS,
});
monitor.watch(baseline.program.programDataAddress);
monitor.start();
const pollTimer = setInterval(() => void detect("poll"), 10_000);
