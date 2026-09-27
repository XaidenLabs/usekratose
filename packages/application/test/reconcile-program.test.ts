import { describe, expect, it } from "vitest";

import {
  formatSecurityEventReport,
  UPGRADEABLE_LOADER_ADDRESS,
} from "@usekratose/core";
import { ProgramReconciliationService } from "../src/reconcile-program.js";
import { FakeGateway, InMemoryProgramStore } from "./fakes.js";
import {
  AUTHORITY_A,
  AUTHORITY_B,
  PROGRAM_ADDRESS,
  PROGRAMDATA_ADDRESS,
  programAccountBytes,
  programDataBytes,
} from "../../core/test/fixtures.js";

const clock = { now: () => new Date("2026-09-17T12:00:00Z") };

function setDeployment(
  gateway: FakeGateway,
  input: {
    readonly authority: string | null;
    readonly executable: readonly number[];
    readonly slot: bigint;
  },
): void {
  gateway.accounts.set(PROGRAM_ADDRESS, {
    account: {
      data: programAccountBytes(),
      executable: true,
      lamports: 1n,
      owner: UPGRADEABLE_LOADER_ADDRESS,
    },
    contextSlot: input.slot,
  });
  gateway.accounts.set(PROGRAMDATA_ADDRESS, {
    account: {
      data: programDataBytes(input),
      executable: false,
      lamports: 1n,
      owner: UPGRADEABLE_LOADER_ADDRESS,
    },
    contextSlot: input.slot + 1n,
  });
}

describe("ProgramReconciliationService", () => {
  it("detects an executable upgrade exactly once", async () => {
    const gateway = new FakeGateway();
    const store = new InMemoryProgramStore();
    const program = store.seedProgram({
      address: PROGRAM_ADDRESS,
      programDataAddress: PROGRAMDATA_ADDRESS,
    });
    const service = new ProgramReconciliationService(gateway, store, clock);

    setDeployment(gateway, {
      authority: AUTHORITY_A,
      executable: [1, 2, 3],
      slot: 100n,
    });
    await service.reconcile(program.id, "startup");

    setDeployment(gateway, {
      authority: AUTHORITY_A,
      executable: [1, 2, 4],
      slot: 200n,
    });
    const first = await service.reconcile(program.id, "websocket");
    const duplicate = await service.reconcile(program.id, "poll");

    expect(first.kind).toBe("change");
    if (first.kind === "change") {
      expect(first.events.map((event) => event.type)).toEqual([
        "PROGRAM_UPGRADED",
      ]);
      expect(first.events[0]?.severity).toBe("high");
      expect(first.snapshot.deploymentSlot).toBe(200n);
      const previous = store.snapshots.get(program.id)?.[0];
      expect(previous).toBeDefined();
      if (previous !== undefined) {
        expect(
          formatSecurityEventReport({
            current: first.snapshot,
            events: first.events,
            previous,
          }),
        ).toContain("Event:\nPROGRAM_UPGRADED");
      }
    }
    expect(duplicate.kind).toBe("no-change");
    expect(store.snapshots.get(program.id)).toHaveLength(2);
    expect(store.events).toHaveLength(1);
  });

  it("detects an executable upgrade through polling without a WebSocket signal", async () => {
    const gateway = new FakeGateway();
    const store = new InMemoryProgramStore();
    const program = store.seedProgram({
      address: PROGRAM_ADDRESS,
      programDataAddress: PROGRAMDATA_ADDRESS,
    });
    const service = new ProgramReconciliationService(gateway, store, clock);

    setDeployment(gateway, {
      authority: AUTHORITY_A,
      executable: [1, 2, 3],
      slot: 100n,
    });
    await service.reconcile(program.id, "startup");

    setDeployment(gateway, {
      authority: AUTHORITY_A,
      executable: [1, 2, 4],
      slot: 200n,
    });
    const result = await service.reconcile(program.id, "poll");

    expect(result.kind).toBe("change");
    if (result.kind === "change") {
      expect(result.events.map((event) => event.type)).toEqual([
        "PROGRAM_UPGRADED",
      ]);
    }
    expect(store.snapshots.get(program.id)).toHaveLength(2);
  });

  it("persists a critical owner-change event without parsing the new loader", async () => {
    const gateway = new FakeGateway();
    const store = new InMemoryProgramStore();
    const program = store.seedProgram({
      address: PROGRAM_ADDRESS,
      programDataAddress: PROGRAMDATA_ADDRESS,
    });
    const service = new ProgramReconciliationService(gateway, store, clock);

    setDeployment(gateway, {
      authority: AUTHORITY_A,
      executable: [1, 2, 3],
      slot: 100n,
    });
    await service.reconcile(program.id, "startup");

    gateway.accounts.set(PROGRAM_ADDRESS, {
      account: {
        data: new Uint8Array(),
        executable: true,
        lamports: 1n,
        owner: "11111111111111111111111111111111",
      },
      contextSlot: 300n,
    });
    const result = await service.reconcile(program.id, "poll");

    expect(result.kind).toBe("change");
    if (result.kind === "change") {
      expect(result.snapshot.programOwner).toBe(
        "11111111111111111111111111111111",
      );
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({
        severity: "critical",
        type: "OWNER_CHANGED",
      });
    }
  });

  it("captures owner and executable-state changes in one observation", async () => {
    const gateway = new FakeGateway();
    const store = new InMemoryProgramStore();
    const program = store.seedProgram({
      address: PROGRAM_ADDRESS,
      programDataAddress: PROGRAMDATA_ADDRESS,
    });
    const service = new ProgramReconciliationService(gateway, store, clock);

    setDeployment(gateway, {
      authority: AUTHORITY_A,
      executable: [1, 2, 3],
      slot: 100n,
    });
    await service.reconcile(program.id, "startup");

    gateway.accounts.set(PROGRAM_ADDRESS, {
      account: {
        data: new Uint8Array(),
        executable: false,
        lamports: 1n,
        owner: "11111111111111111111111111111111",
      },
      contextSlot: 300n,
    });
    const result = await service.reconcile(program.id, "poll");

    expect(result.kind).toBe("change");
    if (result.kind === "change") {
      expect(result.snapshot.programExecutable).toBe(false);
      expect(result.events.map((event) => event.type)).toEqual([
        "PROGRAM_UPGRADED",
        "OWNER_CHANGED",
      ]);
    }
  });

  it("records authority changes and immutability independently of bytecode", async () => {
    const gateway = new FakeGateway();
    const store = new InMemoryProgramStore();
    const program = store.seedProgram({
      address: PROGRAM_ADDRESS,
      programDataAddress: PROGRAMDATA_ADDRESS,
    });
    const service = new ProgramReconciliationService(gateway, store, clock);

    setDeployment(gateway, {
      authority: AUTHORITY_A,
      executable: [1, 2, 3],
      slot: 100n,
    });
    await service.reconcile(program.id, "startup");

    setDeployment(gateway, {
      authority: AUTHORITY_B,
      executable: [1, 2, 3],
      slot: 100n,
    });
    const changedAuthority = await service.reconcile(program.id, "poll");

    setDeployment(gateway, {
      authority: null,
      executable: [1, 2, 3],
      slot: 100n,
    });
    const immutable = await service.reconcile(program.id, "poll");

    expect(changedAuthority.kind).toBe("change");
    if (changedAuthority.kind === "change") {
      expect(changedAuthority.events.map((event) => event.type)).toEqual([
        "AUTHORITY_CHANGED",
      ]);
      expect(changedAuthority.events[0]?.severity).toBe("high");
    }
    expect(immutable.kind).toBe("change");
    if (immutable.kind === "change") {
      expect(immutable.events.map((event) => event.type)).toEqual([
        "PROGRAM_BECAME_IMMUTABLE",
      ]);
      expect(immutable.events[0]?.severity).toBe("info");
    }
  });

  it("records a return to a previously observed authority as a new version", async () => {
    const gateway = new FakeGateway();
    const store = new InMemoryProgramStore();
    const program = store.seedProgram({
      address: PROGRAM_ADDRESS,
      programDataAddress: PROGRAMDATA_ADDRESS,
    });
    const service = new ProgramReconciliationService(gateway, store, clock);

    setDeployment(gateway, {
      authority: AUTHORITY_A,
      executable: [1, 2, 3],
      slot: 100n,
    });
    await service.reconcile(program.id, "startup");

    setDeployment(gateway, {
      authority: AUTHORITY_B,
      executable: [1, 2, 3],
      slot: 100n,
    });
    await service.reconcile(program.id, "poll");

    setDeployment(gateway, {
      authority: AUTHORITY_A,
      executable: [1, 2, 3],
      slot: 100n,
    });
    const returned = await service.reconcile(program.id, "poll");

    expect(returned.kind).toBe("change");
    if (returned.kind === "change") {
      expect(returned.events.map((event) => event.type)).toEqual([
        "AUTHORITY_CHANGED",
      ]);
      expect(returned.snapshot.upgradeAuthority).toBe(AUTHORITY_A);
    }
    expect(store.snapshots.get(program.id)).toHaveLength(3);
    expect(store.events).toHaveLength(2);
  });
});
