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

const errorResponseSchema = z.object({
  error: z.object({ code: z.number().int(), message: z.string() }),
  id: z.number().int(),
});

export interface AccountChangeSignal {
  readonly address: string;
  readonly observedSlot: bigint;
}

export interface SubscriptionHealthEvent {
  readonly error?: Error;
  readonly provider: string;
  readonly state: "connected" | "degraded" | "reconnecting";
}

export interface WebSocketProvider {
  readonly endpoint: string;
  readonly name: string;
}

export interface SolanaWebSocketMonitorOptions {
  readonly endpoint: string;
  readonly fallbackProviders?: readonly WebSocketProvider[];
  readonly onAccountChange: (signal: AccountChangeSignal) => void;
  readonly onHealthChange: (event: SubscriptionHealthEvent) => void;
  readonly providerName?: string;
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
  private providerIndex = 0;
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
    for (const [subscription, subscribedAddress] of this.subscriptions) {
      if (subscribedAddress !== address) continue;
      this.subscriptions.delete(subscription);
      this.unsubscribe(subscription);
    }
  }

  private connect(): void {
    if (this.closed) return;

    const provider = this.providers[this.providerIndex];
    if (provider === undefined) return;
    this.options.onHealthChange({
      provider: provider.name,
      state: "reconnecting",
    });
    const connection = new WebSocket(provider.endpoint);
    this.connection = connection;

    connection.on("open", () => {
      this.reconnectAttempt = 0;
      this.pendingRequests.clear();
      this.subscriptions.clear();
      this.options.onHealthChange({
        provider: provider.name,
        state: "connected",
      });
      for (const address of this.desiredAddresses) this.subscribe(address);
    });

    connection.on("message", (raw) => this.handleMessage(raw.toString()));
    connection.on("error", (error) => {
      this.options.onHealthChange({
        error,
        provider: provider.name,
        state: "degraded",
      });
    });
    connection.on("close", () => {
      if (this.connection === connection) this.connection = null;
      if (this.closed) return;
      this.options.onHealthChange({
        provider: provider.name,
        state: "degraded",
      });
      this.providerIndex = (this.providerIndex + 1) % this.providers.length;
      this.scheduleReconnect();
    });
  }

  private get providers(): readonly WebSocketProvider[] {
    return [
      {
        endpoint: this.options.endpoint,
        name: this.options.providerName ?? "primary",
      },
      ...(this.options.fallbackProviders ?? []),
    ];
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
        if (this.desiredAddresses.has(address)) {
          this.subscriptions.set(subscriptionResponse.data.result, address);
        } else {
          this.unsubscribe(subscriptionResponse.data.result);
        }
      }
      return;
    }

    const errorResponse = errorResponseSchema.safeParse(message);
    if (
      errorResponse.success &&
      this.pendingRequests.delete(errorResponse.data.id)
    ) {
      this.options.onHealthChange({
        error: new Error(
          `Solana WebSocket ${errorResponse.data.error.code}: ${errorResponse.data.error.message}`,
        ),
        provider: this.providers[this.providerIndex]?.name ?? "unknown",
        state: "degraded",
      });
      this.connection?.close();
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

  private unsubscribe(subscription: number): void {
    if (this.connection?.readyState !== WebSocket.OPEN) return;
    this.connection.send(
      JSON.stringify({
        id: ++this.requestId,
        jsonrpc: "2.0",
        method: "accountUnsubscribe",
        params: [subscription],
      }),
    );
  }
}
