import { describe, expect, it } from "vitest";

import { formatSecurityEvent } from "../src/format-security-event.js";
import type { SecurityEvent, VersionSnapshot } from "../src/domain.js";

const previous: VersionSnapshot = {
  accountDataHash: "sha256:account-v1",
  deploymentSlot: 412_881_202n,
  executableHash: "sha256:7aa92",
  executableSize: 10,
  fingerprint: "sha256:fingerprint-v1",
  id: "snapshot-v1",
  idl: null,
  idlHash: null,
  idlInstructions: null,
  metadataHash: null,
  observedAt: new Date("2026-09-17T00:00:00Z"),
  observedSlot: 412_881_203n,
  programAddress: "9xTestProgramAddress",
  programDataAddress: "programdata-address",
  programExecutable: true,
  programId: "program-id",
  programOwner: "loader-v3",
  sourceReferenceHash: null,
  sourceRepositoryUrl: null,
  sourceRevision: null,
  sourceVerificationStatus: "unavailable",
  trustedFingerprint: "sha256:fingerprint-v1",
  upgradeAuthority: "authority-a",
  verificationStatus: "verified",
};

const current: VersionSnapshot = {
  ...previous,
  accountDataHash: "sha256:account-v2",
  deploymentSlot: 412_891_744n,
  executableHash: "sha256:ef193",
  fingerprint: "sha256:fingerprint-v2",
  id: "snapshot-v2",
  observedSlot: 412_891_745n,
  verificationStatus: "stale",
};

const event: SecurityEvent = {
  currentSnapshotId: current.id,
  detectedAt: new Date("2026-09-18T00:00:00Z"),
  evidence: {},
  id: "event-id",
  previousSnapshotId: previous.id,
  programId: previous.programId,
  severity: "high",
  type: "PROGRAM_UPGRADED",
};

describe("formatSecurityEvent", () => {
  it("prints a deterministic human-readable deployment diff", () => {
    expect(formatSecurityEvent({ current, event, previous }))
      .toBe(`USEKRATOSE SECURITY EVENT

Program:
9xTestProgramAddress

Event:
PROGRAM_UPGRADED

Previous deployment:
slot 412,881,202
hash sha256:7aa92
authority authority-a

Current deployment:
slot 412,891,744
hash sha256:ef193
authority authority-a

Changes:
✓ executable changed
✓ deployment slot changed
✗ upgrade authority unchanged

Verification:
STALE

Severity:
HIGH`);
  });
});
