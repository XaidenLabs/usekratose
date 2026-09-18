import { describe, expect, it } from "vitest";

import {
  parseProgramAccount,
  parseProgramDataAccount,
} from "../src/loader-v3.js";
import {
  AUTHORITY_A,
  PROGRAM_ADDRESS,
  PROGRAMDATA_ADDRESS,
  programAccountBytes,
  programDataBytes,
} from "./fixtures.js";

describe("loader-v3 parsing", () => {
  it("resolves ProgramData from Program state", () => {
    expect(parseProgramAccount(programAccountBytes())).toBe(
      PROGRAMDATA_ADDRESS,
    );
  });

  it("extracts deployment slot, authority and executable bytes", () => {
    const deployment = parseProgramDataAccount(
      PROGRAM_ADDRESS,
      PROGRAMDATA_ADDRESS,
      "BPFLoaderUpgradeab1e11111111111111111111111",
      programDataBytes({
        authority: AUTHORITY_A,
        executable: [0x7f, 0x45, 0x4c, 0x46, 1],
        slot: 42n,
      }),
    );

    expect(deployment.deploymentSlot).toBe(42n);
    expect(deployment.upgradeAuthority).toBe(AUTHORITY_A);
    expect(Array.from(deployment.executableBytes)).toEqual([
      0x7f, 0x45, 0x4c, 0x46, 1,
    ]);
  });

  it("treats an absent authority as immutable without shifting bytecode", () => {
    const deployment = parseProgramDataAccount(
      PROGRAM_ADDRESS,
      PROGRAMDATA_ADDRESS,
      "BPFLoaderUpgradeab1e11111111111111111111111",
      programDataBytes({
        authority: null,
        executable: [1, 2, 3],
        slot: 43n,
      }),
    );

    expect(deployment.upgradeAuthority).toBeNull();
    expect(Array.from(deployment.executableBytes)).toEqual([1, 2, 3]);
  });
});
