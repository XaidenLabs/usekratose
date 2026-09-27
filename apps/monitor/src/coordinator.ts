import type { ProgramStore } from "@usekratose/application";
import type { AlertDispatcher } from "@usekratose/alerts";
import type { ExplanationService } from "@usekratose/explanations";
import {
  ProgramReconciliationService,
  type ProgramIntelligenceGateway,
  type SolanaGateway,
} from "@usekratose/application";
import type {
  Cluster,
  MonitoredProgram,
  ReconciliationReason,
} from "@usekratose/core";
import { SolanaWebSocketMonitor } from "@usekratose/solana";
import type { WebSocketProvider } from "@usekratose/solana";

export interface MonitorCoordinatorOptions {
  readonly alertDeliveryIntervalMs?: number;
  readonly alerts?: Pick<AlertDispatcher, "deliverDue" | "enqueue">;
  readonly explanationIntervalMs?: number;
  readonly explanations?: Pick<ExplanationService, "processPending">;
  readonly cluster: Cluster;
  readonly gateway: SolanaGateway;
  readonly portfolioRefreshIntervalMs: number;
  readonly intelligence: ProgramIntelligenceGateway;
  readonly reconciliationIntervalMs: number;
  readonly reconnectBaseDelayMs: number;
  readonly store: ProgramStore;
  readonly websocketEndpoint: string;
  readonly websocketFallbackProviders?: readonly WebSocketProvider[];
  readonly websocketProviderName?: string;
}

export class MonitorCoordinator {
  private alertTimer: NodeJS.Timeout | null = null;
  private explanationTimer: NodeJS.Timeout | null = null;
  private readonly addressToPrograms = new Map<string, Set<string>>();
  private readonly programToAddress = new Map<string, string>();
  private portfolioTimer: NodeJS.Timeout | null = null;
  private reconciliationTimer: NodeJS.Timeout | null = null;
  private readonly pending = new Map<string, Promise<void>>();
  private readonly reconciliation: ProgramReconciliationService;
  private socketHealthy = false;
  private readonly websocket: SolanaWebSocketMonitor;

  public constructor(private readonly options: MonitorCoordinatorOptions) {
    this.reconciliation = new ProgramReconciliationService(
      options.gateway,
      options.store,
      undefined,
      options.intelligence,
    );
    this.websocket = new SolanaWebSocketMonitor({
      endpoint: options.websocketEndpoint,
      ...(options.websocketFallbackProviders === undefined
        ? {}
        : { fallbackProviders: options.websocketFallbackProviders }),
      onAccountChange: ({ address, observedSlot }) => {
        console.info("WebSocket change signal", {
          address,
          observedSlot: observedSlot.toString(),
        });
        for (const programId of this.addressToPrograms.get(address) ?? []) {
          this.enqueue(programId, "websocket");
        }
      },
      onHealthChange: ({ error, provider, state }) => {
        console.info("WebSocket health", {
          error: error?.message,
          provider,
          state,
        });
        this.socketHealthy = state === "connected";
        if (state === "connected") {
          this.enqueueAll("websocket-reconnect");
        } else if (state === "degraded") {
          this.markAllDegraded();
        }
      },
      ...(options.websocketProviderName === undefined
        ? {}
        : { providerName: options.websocketProviderName }),
      reconnectBaseDelayMs: options.reconnectBaseDelayMs,
    });
  }

  public async start(): Promise<void> {
    await this.refreshPortfolio();
    this.websocket.start();
    this.enqueueAll("startup");
    this.reconciliationTimer = setInterval(
      () => this.enqueueAll("poll"),
      this.options.reconciliationIntervalMs,
    );
    if (this.options.alerts !== undefined) {
      this.alertTimer = setInterval(() => {
        void this.options.alerts?.deliverDue().catch((error: unknown) => {
          console.error("Alert delivery failed", { error });
        });
      }, this.options.alertDeliveryIntervalMs ?? 5_000);
    }
    if (this.options.explanations !== undefined) {
      this.explanationTimer = setInterval(() => {
        void this.options.explanations
          ?.processPending()
          .catch((error: unknown) => {
            console.error("AI explanation generation failed", { error });
          });
      }, this.options.explanationIntervalMs ?? 60_000);
    }
    this.portfolioTimer = setInterval(() => {
      void this.refreshPortfolio().catch((error: unknown) => {
        console.error("Portfolio refresh failed", { error });
      });
    }, this.options.portfolioRefreshIntervalMs);
  }

  public stop(): void {
    if (this.alertTimer !== null) clearInterval(this.alertTimer);
    if (this.explanationTimer !== null) clearInterval(this.explanationTimer);
    if (this.portfolioTimer !== null) clearInterval(this.portfolioTimer);
    if (this.reconciliationTimer !== null)
      clearInterval(this.reconciliationTimer);
    this.portfolioTimer = null;
    this.reconciliationTimer = null;
    this.alertTimer = null;
    this.explanationTimer = null;
    this.websocket.stop();
  }

  private enqueue(programId: string, reason: ReconciliationReason): void {
    const current = this.pending.get(programId) ?? Promise.resolve();
    const next = current
      .catch(() => undefined)
      .then(async () => {
        const result = await this.reconciliation.reconcile(programId, reason);
        if (!this.socketHealthy) {
          await this.options.store.setMonitoringStatus(programId, "degraded");
        }
        if (result.kind === "change") {
          if (this.options.alerts !== undefined) {
            await this.options.alerts.enqueue(result.events);
            await this.options.alerts.deliverDue();
          }
          if (this.options.explanations !== undefined) {
            await this.options.explanations.processPending();
          }
          console.info("Deterministic program change detected", {
            eventIds: result.events.map((event) => event.id),
            eventTypes: result.events.map((event) => event.type),
            programId,
            toFingerprint: result.snapshot.fingerprint,
          });
        }
      })
      .catch((error: unknown) => {
        console.error("Program reconciliation failed", {
          error,
          programId,
          reason,
        });
      })
      .finally(() => {
        if (this.pending.get(programId) === next)
          this.pending.delete(programId);
      });
    this.pending.set(programId, next);
  }

  private enqueueAll(reason: ReconciliationReason): void {
    const programIds = new Set(
      [...this.addressToPrograms.values()].flatMap((ids) => [...ids]),
    );
    for (const programId of programIds) this.enqueue(programId, reason);
  }

  private async refreshPortfolio(): Promise<void> {
    const programs = await this.options.store.listActivePrograms(
      this.options.cluster,
    );
    const activeProgramIds = new Set(programs.map((program) => program.id));
    for (const programId of this.programToAddress.keys()) {
      if (!activeProgramIds.has(programId)) this.unregisterProgram(programId);
    }
    for (const program of programs) this.registerProgram(program);
  }

  private markAllDegraded(): void {
    const programIds = new Set(
      [...this.addressToPrograms.values()].flatMap((ids) => [...ids]),
    );
    for (const programId of programIds) {
      void this.options.store
        .setMonitoringStatus(programId, "degraded")
        .catch((error: unknown) => {
          console.error("Failed to mark monitoring degraded", {
            error,
            programId,
          });
        });
    }
  }

  private registerProgram(program: MonitoredProgram): void {
    const previousAddress = this.programToAddress.get(program.id);
    if (
      previousAddress !== undefined &&
      previousAddress !== program.programDataAddress
    ) {
      this.unregisterProgram(program.id);
    }
    const ids =
      this.addressToPrograms.get(program.programDataAddress) ?? new Set();
    ids.add(program.id);
    this.addressToPrograms.set(program.programDataAddress, ids);
    this.programToAddress.set(program.id, program.programDataAddress);
    this.websocket.watch(program.programDataAddress);
  }

  private unregisterProgram(programId: string): void {
    const address = this.programToAddress.get(programId);
    if (address === undefined) return;
    this.programToAddress.delete(programId);
    const ids = this.addressToPrograms.get(address);
    ids?.delete(programId);
    if (ids === undefined || ids.size > 0) return;
    this.addressToPrograms.delete(address);
    this.websocket.unwatch(address);
  }
}
