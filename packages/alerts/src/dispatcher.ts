import type { SecurityEvent, Severity } from "@usekratose/core";

import { decryptSecret, signWebhook } from "./crypto.js";
import type { AlertStore, WebhookTransport } from "./types.js";

const severityRank: Readonly<Record<Severity, number>> = {
  info: 1,
  low: 2,
  medium: 3,
  high: 4,
  critical: 5,
};

const retryDelaysMs = [15_000, 60_000, 300_000, 900_000] as const;

export function webhookPayload(
  event: SecurityEvent,
  programAddress: string,
): Readonly<Record<string, unknown>> {
  return {
    changes: event.evidence,
    detectedAt: event.detectedAt.toISOString(),
    event: event.type,
    eventId: event.id,
    program: programAddress,
    severity: event.severity,
    snapshot: {
      current: event.currentSnapshotId,
      previous: event.previousSnapshotId,
    },
  };
}

export class AlertDispatcher {
  public constructor(
    private readonly store: AlertStore,
    private readonly transport: WebhookTransport,
    private readonly encryptionKey: string,
  ) {}

  public enqueue(events: readonly SecurityEvent[]): Promise<void> {
    return this.store.enqueueAlertDeliveries(events);
  }

  public async deliverDue(now = new Date(), limit = 25): Promise<number> {
    const deliveries = await this.store.claimDueDeliveries(now, limit);
    for (const delivery of deliveries) {
      const attempts = delivery.attempts + 1;
      if (!delivery.destination.enabled) {
        await this.store.markDeliverySucceeded(delivery.deliveryId, now, 204);
        continue;
      }
      if (
        severityRank[delivery.event.severity] <
        severityRank[delivery.destination.minSeverity]
      ) {
        await this.store.markDeliverySucceeded(delivery.deliveryId, now, 204);
        continue;
      }

      if (delivery.destination.type === "in_app") {
        await this.store.markDeliverySucceeded(delivery.deliveryId, now, 204);
        continue;
      }

      try {
        const body = JSON.stringify(
          webhookPayload(delivery.event, delivery.programAddress),
        );
        const timestamp = Math.floor(now.getTime() / 1000);
        const secret = decryptSecret(
          delivery.destination.secretCiphertext,
          this.encryptionKey,
        );
        const response = await this.transport.send({
          body,
          headers: {
            "content-type": "application/json",
            "user-agent": "UseKratose-Webhooks/1.0",
            "x-usekratose-delivery": delivery.deliveryId,
            "x-usekratose-event": delivery.event.type,
            "x-usekratose-signature": signWebhook(body, timestamp, secret),
          },
          url: delivery.destination.destination,
        });
        if (response.status < 200 || response.status >= 300) {
          throw new Error(`Webhook returned HTTP ${response.status}`);
        }
        await this.store.markDeliverySucceeded(
          delivery.deliveryId,
          now,
          response.status,
        );
      } catch (error) {
        const delay = retryDelaysMs[attempts - 1];
        await this.store.markDeliveryFailed({
          attempts,
          deliveryId: delivery.deliveryId,
          error: error instanceof Error ? error.message : "Unknown error",
          nextAttemptAt:
            delay === undefined ? null : new Date(now.getTime() + delay),
        });
      }
    }
    return deliveries.length;
  }
}

export class FetchWebhookTransport implements WebhookTransport {
  public async send(input: {
    readonly body: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly url: string;
  }): Promise<{ readonly status: number }> {
    const response = await fetch(input.url, {
      body: input.body,
      headers: input.headers,
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    return { status: response.status };
  }
}
