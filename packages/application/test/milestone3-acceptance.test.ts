import { describe, expect, it } from "vitest";

import type { ProgramIntelligenceGateway } from "../src/ports.js";
import { ProgramReconciliationService } from "../src/reconcile-program.js";
import {
  formatProgramDiffReport,
  type SnapshotEnrichment,
  UPGRADEABLE_LOADER_ADDRESS,
} from "@usekratose/core";
import { FakeGateway, InMemoryProgramStore } from "./fakes.js";
import {
  AUTHORITY_A,
  PROGRAM_ADDRESS,
  PROGRAMDATA_ADDRESS,
  programAccountBytes,
  programDataBytes,
} from "../../core/test/fixtures.js";

class SequenceIntelligence implements ProgramIntelligenceGateway {
  private index = 0;

  public constructor(
    private readonly observations: readonly SnapshotEnrichment[],
  ) {}

  public async retrieve(): Promise<SnapshotEnrichment> {
    const observation =
      this.observations[this.index] ?? this.observations.at(-1);
    this.index += 1;
    if (observation === undefined) return {};
    return observation;
  }
}

function setDeployment(
  gateway: FakeGateway,
  executable: readonly number[],
  slot: bigint,
): void {
  gateway.accounts.set(PROGRAM_ADDRESS, {
    account: {
      data: programAccountBytes(),
      executable: true,
      lamports: 1n,
      owner: UPGRADEABLE_LOADER_ADDRESS,
    },
    contextSlot: slot,
  });
  gateway.accounts.set(PROGRAMDATA_ADDRESS, {
    account: {
      data: programDataBytes({ authority: AUTHORITY_A, executable, slot }),
      executable: false,
      lamports: 1n,
      owner: UPGRADEABLE_LOADER_ADDRESS,
    },
    contextSlot: slot + 1n,
  });
}

const deposit = { accounts: [], args: [], name: "deposit" };
const withdraw = { accounts: [], args: [], name: "withdraw" };
const adminWithdraw = {
  accounts: [
    { name: "admin", signer: true, writable: false },
    { name: "vault", signer: false, writable: true },
  ],
  args: [],
  name: "adminWithdraw",
};

describe("Milestone 3 automatic intelligence acceptance", () => {
  it("turns a stored v1 to v2 deployment into an explainable high event", async () => {
    const gateway = new FakeGateway();
    const store = new InMemoryProgramStore();
    const program = store.seedProgram({
      address: PROGRAM_ADDRESS,
      programDataAddress: PROGRAMDATA_ADDRESS,
    });
    const intelligence = new SequenceIntelligence([
      {
        idl: { instructions: [deposit, withdraw] },
        source: {
          repositoryUrl: "https://github.com/example/protocol",
          revision: "821a",
          verificationStatus: "verified",
        },
        verificationStatus: "verified",
      },
      {
        idl: { instructions: [deposit, withdraw, adminWithdraw] },
        source: {
          repositoryUrl: "https://github.com/example/protocol",
          revision: "994f",
          verificationStatus: "unverified",
        },
      },
    ]);
    const service = new ProgramReconciliationService(
      gateway,
      store,
      { now: () => new Date("2026-09-18T00:00:00Z") },
      intelligence,
    );

    setDeployment(gateway, [1, 2, 3], 100n);
    await service.reconcile(program.id, "startup");
    setDeployment(gateway, [1, 2, 4], 200n);
    const result = await service.reconcile(program.id, "websocket");

    expect(result.kind).toBe("change");
    if (result.kind !== "change") return;
    expect(result.events.map((event) => event.type)).toEqual([
      "PROGRAM_UPGRADED",
      "IDL_CHANGED",
      "INSTRUCTION_ADDED",
      "VERIFICATION_STALE",
    ]);
    expect(
      result.events.find((event) => event.type === "INSTRUCTION_ADDED"),
    ).toMatchObject({
      evidence: {
        instructionDefinitions: [
          {
            accounts: [
              { name: "admin", signer: true, writable: false },
              { name: "vault", signer: false, writable: true },
            ],
            name: "adminWithdraw",
          },
        ],
      },
      severity: "high",
    });
    const previous = store.snapshots.get(program.id)?.[0];
    expect(previous).toBeDefined();
    if (previous === undefined) return;
    const report = formatProgramDiffReport({
      current: result.snapshot,
      events: result.events,
      previous,
    });
    expect(report).toContain("Executable:\nCHANGED");
    expect(report).toContain("IDL:\nCHANGED");
    expect(report).toContain("+ adminWithdraw");
    expect(report).toContain("+ requires signer: admin");
    expect(report).toContain("+ writes to: vault");
    expect(report).toContain("Previous verification:\nSTALE");
    expect(report).toContain("Severity:\nHIGH");
  });
});
