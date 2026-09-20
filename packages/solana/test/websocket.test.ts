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
    for (const monitor of monitors) monitor.stop();
    await Promise.all(servers.map(closeServer));
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
});
