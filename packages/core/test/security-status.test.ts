import { describe, expect, it } from "vitest";

import { deriveProgramSecurityStatus } from "../src/security-status.js";
import type { VersionSnapshot } from "../src/domain.js";

function snapshot(overrides: Partial<VersionSnapshot> = {}): VersionSnapshot {
  return {
    accountDataHash: "account",
    deploymentSlot: 1n,
    executableHash: "executable",
    executableSize: 1,
    fingerprint: "fingerprint",
    id: "snapshot",
    idl: null,
    idlHash: null,
    idlInstructions: null,
    metadataHash: null,
    observedAt: new Date(),
    observedSlot: 1n,
    programAddress: "program",
    programDataAddress: "programdata",
    programExecutable: true,
    programId: "program-id",
    programOwner: "loader",
    sourceReferenceHash: null,
    sourceRepositoryUrl: null,
    sourceRevision: null,
    sourceVerificationStatus: "unavailable",
    trustedFingerprint: null,
    upgradeAuthority: "authority",
    verificationStatus: "unknown",
    ...overrides,
  };
}

describe("program security status", () => {
  it("derives explicit non-safety states", () => {
    expect(
      deriveProgramSecurityStatus({ hasPriorSnapshot: false, snapshot: null }),
    ).toBe("unknown");
    expect(
      deriveProgramSecurityStatus({
        hasPriorSnapshot: false,
        snapshot: snapshot(),
      }),
    ).toBe("unverified");
    expect(
      deriveProgramSecurityStatus({
        hasPriorSnapshot: true,
        snapshot: snapshot(),
      }),
    ).toBe("review_required");
    expect(
      deriveProgramSecurityStatus({
        hasPriorSnapshot: true,
        snapshot: snapshot({ verificationStatus: "stale" }),
      }),
    ).toBe("stale");
    expect(
      deriveProgramSecurityStatus({
        hasPriorSnapshot: true,
        snapshot: snapshot({ upgradeAuthority: null }),
      }),
    ).toBe("immutable");
    expect(
      deriveProgramSecurityStatus({
        hasPriorSnapshot: true,
        snapshot: snapshot({
          trustedFingerprint: "fingerprint",
          verificationStatus: "verified",
        }),
      }),
    ).toBe("current");
  });
});
