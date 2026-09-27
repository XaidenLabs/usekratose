import { describe, expect, it } from "vitest";

import {
  createSecurityEventCandidates,
  createSnapshotCandidate,
  formatSecurityEventReport,
  parseProgramDataAccount,
  UPGRADEABLE_LOADER_ADDRESS,
} from "@usekratose/core";
import { InMemoryProgramStore } from "./fakes.js";
import {
  AUTHORITY_A,
  PROGRAM_ADDRESS,
  PROGRAMDATA_ADDRESS,
  programDataBytes,
} from "../../core/test/fixtures.js";

describe("Milestone 2 stored fixture acceptance", () => {
  it("turns a trusted v1 to v2 upgrade into stable, deduplicated events", async () => {
    const store = new InMemoryProgramStore();
    const program = store.seedProgram({
      address: PROGRAM_ADDRESS,
      programDataAddress: PROGRAMDATA_ADDRESS,
    });
    const v1Candidate = createSnapshotCandidate({
      deployment: parseProgramDataAccount(
        PROGRAM_ADDRESS,
        PROGRAMDATA_ADDRESS,
        UPGRADEABLE_LOADER_ADDRESS,
        programDataBytes({
          authority: AUTHORITY_A,
          executable: [1, 2, 3],
          slot: 412_881_202n,
        }),
      ),
      enrichment: { verificationStatus: "verified" },
      observedAt: new Date("2026-09-17T00:00:00Z"),
      observedSlot: 412_881_203n,
      previous: null,
    });
    const v1 = await store.persistBaseline(program.id, v1Candidate);
    const v2Candidate = createSnapshotCandidate({
      deployment: parseProgramDataAccount(
        PROGRAM_ADDRESS,
        PROGRAMDATA_ADDRESS,
        UPGRADEABLE_LOADER_ADDRESS,
        programDataBytes({
          authority: AUTHORITY_A,
          executable: [1, 2, 4],
          slot: 412_891_744n,
        }),
      ),
      observedAt: new Date("2026-09-18T00:00:00Z"),
      observedSlot: 412_891_745n,
      previous: v1,
    });
    const eventCandidates = createSecurityEventCandidates(
      v1,
      v2Candidate,
      new Date("2026-09-18T00:00:01Z"),
    );

    const first = await store.persistTransition(
      program.id,
      v1.id,
      v2Candidate,
      eventCandidates,
    );
    const replay = await store.persistTransition(
      program.id,
      v1.id,
      v2Candidate,
      eventCandidates,
    );

    expect(first.inserted).toBe(true);
    expect(first.events.map((event) => event.type)).toEqual([
      "PROGRAM_UPGRADED",
      "VERIFICATION_STALE",
    ]);
    expect(first.snapshot.verificationStatus).toBe("stale");
    expect(replay.inserted).toBe(false);
    expect(store.snapshots.get(program.id)).toHaveLength(2);
    expect(store.events).toHaveLength(2);
    expect(
      formatSecurityEventReport({
        current: first.snapshot,
        events: first.events.filter(
          (event) => event.type === "PROGRAM_UPGRADED",
        ),
        previous: v1,
      }),
    ).toContain("Verification:\nSTALE");
  });
});
