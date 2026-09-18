import { describe, expect, it } from "vitest";

import { createSnapshotCandidate } from "../src/fingerprint.js";
import { parseProgramDataAccount } from "../src/loader-v3.js";
import {
  AUTHORITY_A,
  PROGRAM_ADDRESS,
  PROGRAMDATA_ADDRESS,
  programDataBytes,
} from "./fixtures.js";

describe("deployment fingerprints", () => {
  it("is stable across observers and observation times", () => {
    const deployment = parseProgramDataAccount(
      PROGRAM_ADDRESS,
      PROGRAMDATA_ADDRESS,
      "BPFLoaderUpgradeab1e11111111111111111111111",
      programDataBytes({
        authority: AUTHORITY_A,
        executable: [1, 2, 3, 4],
        slot: 100n,
      }),
    );

    const first = createSnapshotCandidate({
      deployment,
      observedAt: new Date("2026-01-01T00:00:00Z"),
      observedSlot: 101n,
    });
    const second = createSnapshotCandidate({
      deployment,
      observedAt: new Date("2026-02-01T00:00:00Z"),
      observedSlot: 999n,
    });

    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.executableHash).toBe(second.executableHash);
  });

  it("changes when executable bytes change", () => {
    const create = (lastByte: number) =>
      createSnapshotCandidate({
        deployment: parseProgramDataAccount(
          PROGRAM_ADDRESS,
          PROGRAMDATA_ADDRESS,
          "BPFLoaderUpgradeab1e11111111111111111111111",
          programDataBytes({
            authority: AUTHORITY_A,
            executable: [1, 2, 3, lastByte],
            slot: 100n,
          }),
        ),
        observedAt: new Date("2026-01-01T00:00:00Z"),
        observedSlot: 101n,
      });

    expect(create(4).fingerprint).not.toBe(create(5).fingerprint);
    expect(create(4).executableHash).not.toBe(create(5).executableHash);
  });
});
