import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";
import type { SecurityEvent } from "@usekratose/core";

import {
  AlertDispatcher,
  decryptSecret,
  encryptSecret,
  signWebhook,
  verifyWebhookSignature,
  type AlertStore,
  type PendingAlertDelivery,
  type WebhookTransport,
} from "../src/index.js";

const encryptionKey = Buffer.alloc(32, 7).toString("base64");
const event: SecurityEvent = {
  currentSnapshotId: "current",
  detectedAt: new Date("2026-09-20T12:00:00Z"),
  evidence: { executableChanged: true },
  id: "event-1",
  previousSnapshotId: "previous",
  programId: "program-1",
  severity: "high",
  type: "PROGRAM_UPGRADED",
};

function delivery(
  overrides: Partial<PendingAlertDelivery> = {},
): PendingAlertDelivery {
  return {
    attempts: 0,
    deliveryId: "delivery-1",
    destination: {
      destination: "https://example.com/webhooks/usekratose",
      enabled: true,
      id: "destination-1",
      minSeverity: "high",
      projectId: "project-1",
      secretCiphertext: encryptSecret("webhook-secret", encryptionKey),
      type: "webhook",
    },
    event,
    programAddress: "Program1111111111111111111111111111111111",
    ...overrides,
  };
}

class FakeStore implements AlertStore {
  public due: PendingAlertDelivery[] = [];
  public enqueued = new Set<string>();
  public failures: Array<{
    readonly attempts: number;
    readonly next: Date | null;
  }> = [];
  public succeeded: string[] = [];

  public async claimDueDeliveries(): Promise<readonly PendingAlertDelivery[]> {
    const claimed = [...this.due];
    this.due = [];
    return claimed;
  }

  public async enqueueAlertDeliveries(
    events: readonly SecurityEvent[],
  ): Promise<void> {
    for (const item of events) this.enqueued.add(item.id);
  }

  public async markDeliveryFailed(input: {
    readonly attempts: number;
    readonly deliveryId: string;
    readonly error: string;
    readonly nextAttemptAt: Date | null;
  }): Promise<void> {
    this.failures.push({ attempts: input.attempts, next: input.nextAttemptAt });
  }

  public async markDeliverySucceeded(deliveryId: string): Promise<void> {
    this.succeeded.push(deliveryId);
  }
}

class FakeTransport implements WebhookTransport {
  public calls: Array<{
    readonly body: string;
    readonly headers: Readonly<Record<string, string>>;
  }> = [];
  public status = 200;

  public async send(input: {
    readonly body: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly url: string;
  }): Promise<{ readonly status: number }> {
    this.calls.push(input);
    return { status: this.status };
  }
}

describe("Milestone 4 alerts", () => {
  it("encrypts secrets and verifies signed payloads", () => {
    const encrypted = encryptSecret("webhook-secret", encryptionKey);
    expect(decryptSecret(encrypted, encryptionKey)).toBe("webhook-secret");
    const signature = signWebhook('{"ok":true}', 1_700_000_000, "secret");
    expect(
      verifyWebhookSignature({
        body: '{"ok":true}',
        now: 1_700_000_100,
        secret: "secret",
        signature,
      }),
    ).toBe(true);
  });

  it("delivers a high-severity event once", async () => {
    const store = new FakeStore();
    const transport = new FakeTransport();
    store.due.push(delivery());
    const dispatcher = new AlertDispatcher(store, transport, encryptionKey);

    await dispatcher.enqueue([event, event]);
    await dispatcher.deliverDue(new Date("2026-09-20T12:00:00Z"));

    expect(store.enqueued).toEqual(new Set([event.id]));
    expect(store.succeeded).toEqual(["delivery-1"]);
    expect(transport.calls).toHaveLength(1);
    expect(transport.calls[0]?.headers["x-usekratose-signature"]).toMatch(
      /^t=\d+,v1=[a-f0-9]{64}$/,
    );
  });

  it("does not send below the destination threshold", async () => {
    const store = new FakeStore();
    const transport = new FakeTransport();
    store.due.push(
      delivery({
        event: { ...event, severity: "medium" },
      }),
    );
    const dispatcher = new AlertDispatcher(store, transport, encryptionKey);
    await dispatcher.deliverDue();
    expect(transport.calls).toHaveLength(0);
    expect(store.succeeded).toEqual(["delivery-1"]);
  });

  it("retries failed webhooks with bounded backoff", async () => {
    const store = new FakeStore();
    const transport = new FakeTransport();
    transport.status = 503;
    store.due.push(delivery());
    const dispatcher = new AlertDispatcher(store, transport, encryptionKey);
    const now = new Date("2026-09-20T12:00:00Z");
    await dispatcher.deliverDue(now);
    expect(store.failures).toEqual([
      { attempts: 1, next: new Date("2026-09-20T12:00:15Z") },
    ]);
  });

  it("records in-app notifications without an outbound request", async () => {
    const store = new FakeStore();
    const transport = new FakeTransport();
    store.due.push(
      delivery({
        destination: { ...delivery().destination, type: "in_app" },
      }),
    );
    const dispatcher = new AlertDispatcher(store, transport, encryptionKey);
    await dispatcher.deliverDue();
    expect(store.succeeded).toEqual(["delivery-1"]);
    expect(transport.calls).toHaveLength(0);
  });

  it("does not send to a destination disabled after enqueue", async () => {
    const store = new FakeStore();
    const transport = new FakeTransport();
    store.due.push(
      delivery({
        destination: { ...delivery().destination, enabled: false },
      }),
    );
    const dispatcher = new AlertDispatcher(store, transport, encryptionKey);
    await dispatcher.deliverDue();
    expect(store.succeeded).toEqual(["delivery-1"]);
    expect(transport.calls).toHaveLength(0);
  });
});
