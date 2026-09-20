import type { SecurityEvent, Severity } from "@usekratose/core";

export type AlertDestinationType = "webhook" | "in_app";
export type AlertDeliveryStatus =
  "pending" | "processing" | "delivered" | "failed" | "dead";

export interface AlertDestination {
  readonly destination: string;
  readonly enabled: boolean;
  readonly id: string;
  readonly minSeverity: Severity;
  readonly projectId: string;
  readonly secretCiphertext: string;
  readonly type: AlertDestinationType;
}

export interface PendingAlertDelivery {
  readonly attempts: number;
  readonly deliveryId: string;
  readonly destination: AlertDestination;
  readonly event: SecurityEvent;
  readonly programAddress: string;
}

export interface AlertStore {
  claimDueDeliveries(
    now: Date,
    limit: number,
  ): Promise<readonly PendingAlertDelivery[]>;
  enqueueAlertDeliveries(events: readonly SecurityEvent[]): Promise<void>;
  markDeliveryFailed(input: {
    readonly attempts: number;
    readonly deliveryId: string;
    readonly error: string;
    readonly nextAttemptAt: Date | null;
  }): Promise<void>;
  markDeliverySucceeded(
    deliveryId: string,
    deliveredAt: Date,
    responseStatus: number,
  ): Promise<void>;
}

export interface WebhookTransport {
  send(input: {
    readonly body: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly url: string;
  }): Promise<{ readonly status: number }>;
}
