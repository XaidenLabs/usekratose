import { describe, expect, it } from "vitest";

import { UPGRADEABLE_LOADER_ADDRESS } from "@usekratose/core";
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
      expect(first.event.eventTypes).toEqual(["EXECUTABLE_CHANGED"]);
      expect(first.event.severity).toBe("high");
      expect(first.snapshot.deploymentSlot).toBe(200n);
    }
    expect(duplicate.kind).toBe("no-change");
    expect(store.snapshots.get(program.id)).toHaveLength(2);
    expect(store.events).toHaveLength(1);
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
      expect(changedAuthority.event.eventTypes).toEqual(["AUTHORITY_CHANGED"]);
    }
    expect(immutable.kind).toBe("change");
    if (immutable.kind === "change") {
      expect(immutable.event.eventTypes).toEqual([
        "AUTHORITY_CHANGED",
        "BECAME_IMMUTABLE",
      ]);
    }
  });
});
