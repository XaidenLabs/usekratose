import { afterEach, describe, expect, it } from "vitest";
import { WebSocketServer } from "ws";

import { SolanaWebSocketMonitor } from "../src/websocket.js";

const PROGRAMDATA_ADDRESS = "4Ec7ZxZS6Sbdg5UGSLHbAnM7GQHp2eFd4KYWRexAipQT";

function listening(server: WebSocketServer): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
}

function closeServer(server: WebSocketServer): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}

describe("SolanaWebSocketMonitor", () => {
  const monitors: SolanaWebSocketMonitor[] = [];
  const servers: WebSocketServer[] = [];

  afterEach(async () => {
    for (const monitor of monitors.splice(0)) monitor.stop();
    await Promise.all(servers.splice(0).map(closeServer));
  });

  it("subscribes at finalized commitment and emits a ProgramData signal", async () => {
    const server = new WebSocketServer({ port: 0 });
    servers.push(server);
    await listening(server);
    const address = server.address();
    if (typeof address === "string" || address === null) {
      throw new Error("Expected a TCP WebSocket test server");
    }

    const subscriptionRequest = new Promise<Readonly<Record<string, unknown>>>(
      (resolve) => {
        server.once("connection", (socket) => {
          socket.once("message", (raw) => {
            const request = JSON.parse(raw.toString()) as Readonly<
              Record<string, unknown>
            >;
            resolve(request);
            socket.send(
              JSON.stringify({ id: request.id, jsonrpc: "2.0", result: 77 }),
            );
            socket.send(
              JSON.stringify({
                jsonrpc: "2.0",
                method: "accountNotification",
                params: {
                  result: { context: { slot: 412_891_744 }, value: {} },
                  subscription: 77,
                },
              }),
            );
          });
        });
      },
    );
    const signal = new Promise<{
      readonly address: string;
      readonly observedSlot: bigint;
    }>((resolve) => {
      const monitor = new SolanaWebSocketMonitor({
        endpoint: `ws://127.0.0.1:${address.port}`,
        onAccountChange: resolve,
        onHealthChange: () => undefined,
        reconnectBaseDelayMs: 10,
      });
      monitors.push(monitor);
      monitor.watch(PROGRAMDATA_ADDRESS);
      monitor.start();
    });

    await expect(subscriptionRequest).resolves.toMatchObject({
      method: "accountSubscribe",
      params: [
        PROGRAMDATA_ADDRESS,
        { commitment: "finalized", encoding: "base64" },
      ],
    });
    await expect(signal).resolves.toEqual({
      address: PROGRAMDATA_ADDRESS,
      observedSlot: 412_891_744n,
    });
  });

  it("unsubscribes when an address is no longer watched", async () => {
    const server = new WebSocketServer({ port: 0 });
    servers.push(server);
    await listening(server);
    const address = server.address();
    if (typeof address === "string" || address === null) {
      throw new Error("Expected a TCP WebSocket test server");
    }

    let monitor: SolanaWebSocketMonitor | undefined;
    const unsubscribeRequest = new Promise<Readonly<Record<string, unknown>>>(
      (resolve) => {
        server.once("connection", (socket) => {
          socket.on("message", (raw) => {
            const request = JSON.parse(raw.toString()) as Readonly<
              Record<string, unknown>
            >;
            if (request.method === "accountSubscribe") {
              socket.send(
                JSON.stringify({ id: request.id, jsonrpc: "2.0", result: 77 }),
              );
              setTimeout(() => monitor?.unwatch(PROGRAMDATA_ADDRESS), 0);
            } else if (request.method === "accountUnsubscribe") {
              resolve(request);
            }
          });
        });
      },
    );
    monitor = new SolanaWebSocketMonitor({
      endpoint: `ws://127.0.0.1:${address.port}`,
      onAccountChange: () => undefined,
      onHealthChange: () => undefined,
      reconnectBaseDelayMs: 10,
    });
    monitors.push(monitor);
    monitor.watch(PROGRAMDATA_ADDRESS);
    monitor.start();

    await expect(unsubscribeRequest).resolves.toMatchObject({
      method: "accountUnsubscribe",
      params: [77],
    });
  });

  it("marks the connection degraded when a subscription is rejected", async () => {
    const server = new WebSocketServer({ port: 0 });
    servers.push(server);
    await listening(server);
    const address = server.address();
    if (typeof address === "string" || address === null) {
      throw new Error("Expected a TCP WebSocket test server");
    }

    server.once("connection", (socket) => {
      socket.once("message", (raw) => {
        const request = JSON.parse(raw.toString()) as Readonly<
          Record<string, unknown>
        >;
        socket.send(
          JSON.stringify({
            error: { code: -32_602, message: "Invalid params" },
            id: request.id,
            jsonrpc: "2.0",
          }),
        );
      });
    });
    const degraded = new Promise<Error>((resolve) => {
      const monitor = new SolanaWebSocketMonitor({
        endpoint: `ws://127.0.0.1:${address.port}`,
        onAccountChange: () => undefined,
        onHealthChange: ({ error, state }) => {
          if (state === "degraded" && error !== undefined) resolve(error);
        },
        reconnectBaseDelayMs: 10,
      });
      monitors.push(monitor);
      monitor.watch(PROGRAMDATA_ADDRESS);
      monitor.start();
    });

    await expect(degraded).resolves.toMatchObject({
      message: "Solana WebSocket -32602: Invalid params",
    });
  });

  it("rotates to a fallback provider after the primary disconnects", async () => {
    const primary = new WebSocketServer({ port: 0 });
    const fallback = new WebSocketServer({ port: 0 });
    servers.push(primary, fallback);
    await Promise.all([listening(primary), listening(fallback)]);
    const primaryAddress = primary.address();
    const fallbackAddress = fallback.address();
    if (
      typeof primaryAddress === "string" ||
      primaryAddress === null ||
      typeof fallbackAddress === "string" ||
      fallbackAddress === null
    ) {
      throw new Error("Expected TCP WebSocket test servers");
    }

    primary.once("connection", (socket) => socket.close());
    const fallbackRequest = new Promise<Readonly<Record<string, unknown>>>(
      (resolve) => {
        fallback.once("connection", (socket) => {
          socket.once("message", (raw) => {
            resolve(
              JSON.parse(raw.toString()) as Readonly<Record<string, unknown>>,
            );
          });
        });
      },
    );
    const providers: string[] = [];
    const monitor = new SolanaWebSocketMonitor({
      endpoint: `ws://127.0.0.1:${primaryAddress.port}`,
      fallbackProviders: [
        {
          endpoint: `ws://127.0.0.1:${fallbackAddress.port}`,
          name: "fallback",
        },
      ],
      onAccountChange: () => undefined,
      onHealthChange: ({ provider, state }) => {
        if (state === "connected") providers.push(provider);
      },
      providerName: "solami",
      reconnectBaseDelayMs: 10,
    });
    monitors.push(monitor);
    monitor.watch(PROGRAMDATA_ADDRESS);
    monitor.start();

    await expect(fallbackRequest).resolves.toMatchObject({
      method: "accountSubscribe",
    });
    expect(providers).toEqual(["solami", "fallback"]);
  });
});
