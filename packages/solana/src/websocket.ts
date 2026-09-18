import WebSocket from "ws";
import { z } from "zod";

const notificationSchema = z.object({
  method: z.literal("accountNotification"),
  params: z.object({
    result: z.object({ context: z.object({ slot: z.number().int() }) }),
    subscription: z.number().int(),
  }),
});

const subscriptionResponseSchema = z.object({
  id: z.number().int(),
  result: z.number().int(),
});

export interface AccountChangeSignal {
  readonly address: string;
  readonly observedSlot: bigint;
}

export interface SubscriptionHealthEvent {
  readonly error?: Error;
  readonly state: "connected" | "degraded" | "reconnecting";
}

export interface SolanaWebSocketMonitorOptions {
  readonly endpoint: string;
  readonly onAccountChange: (signal: AccountChangeSignal) => void;
  readonly onHealthChange: (event: SubscriptionHealthEvent) => void;
  readonly reconnectBaseDelayMs?: number;
}

export class SolanaWebSocketMonitor {
  private closed = false;
  private connection: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private requestId = 0;
  private readonly desiredAddresses = new Set<string>();
  private readonly pendingRequests = new Map<number, string>();
  private readonly subscriptions = new Map<number, string>();

  public constructor(private readonly options: SolanaWebSocketMonitorOptions) {}

  public start(): void {
    this.closed = false;
    this.connect();
  }

  public stop(): void {
    this.closed = true;
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.connection?.close();
    this.connection = null;
    this.pendingRequests.clear();
    this.subscriptions.clear();
  }

  public watch(address: string): void {
    this.desiredAddresses.add(address);
    if (this.connection?.readyState === WebSocket.OPEN) {
      this.subscribe(address);
    }
  }

  public unwatch(address: string): void {
    this.desiredAddresses.delete(address);
  }

  private connect(): void {
    if (this.closed) return;

    this.options.onHealthChange({ state: "reconnecting" });
    const connection = new WebSocket(this.options.endpoint);
    this.connection = connection;

    connection.on("open", () => {
      this.reconnectAttempt = 0;
      this.pendingRequests.clear();
      this.subscriptions.clear();
      this.options.onHealthChange({ state: "connected" });
      for (const address of this.desiredAddresses) this.subscribe(address);
    });

    connection.on("message", (raw) => this.handleMessage(raw.toString()));
    connection.on("error", (error) => {
      this.options.onHealthChange({ error, state: "degraded" });
    });
    connection.on("close", () => {
      if (this.connection === connection) this.connection = null;
      this.options.onHealthChange({ state: "degraded" });
      this.scheduleReconnect();
    });
  }

  private handleMessage(raw: string): void {
    let message: unknown;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }

    const subscriptionResponse = subscriptionResponseSchema.safeParse(message);
    if (subscriptionResponse.success) {
      const address = this.pendingRequests.get(subscriptionResponse.data.id);
      if (address !== undefined) {
        this.pendingRequests.delete(subscriptionResponse.data.id);
        this.subscriptions.set(subscriptionResponse.data.result, address);
      }
      return;
    }

    const notification = notificationSchema.safeParse(message);
    if (!notification.success) return;
    const address = this.subscriptions.get(
      notification.data.params.subscription,
    );
    if (address === undefined) return;

    this.options.onAccountChange({
      address,
      observedSlot: BigInt(notification.data.params.result.context.slot),
    });
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer !== null) return;
    const baseDelay = this.options.reconnectBaseDelayMs ?? 1_000;
    const exponentialDelay = Math.min(
      baseDelay * 2 ** this.reconnectAttempt,
      30_000,
    );
    const jitteredDelay = Math.round(
      exponentialDelay * (0.8 + Math.random() * 0.4),
    );
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, jitteredDelay);
  }

  private subscribe(address: string): void {
    const duplicate =
      [...this.pendingRequests.values()].includes(address) ||
      [...this.subscriptions.values()].includes(address);
    if (duplicate || this.connection?.readyState !== WebSocket.OPEN) return;

    const id = ++this.requestId;
    this.pendingRequests.set(id, address);
    this.connection.send(
      JSON.stringify({
        id,
        jsonrpc: "2.0",
        method: "accountSubscribe",
        params: [address, { commitment: "finalized", encoding: "base64" }],
      }),
    );
  }
}
