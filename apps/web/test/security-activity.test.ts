import { describe, expect, it } from "vitest";
import type { RecentPublicSecurityActivity } from "@usekratose/database";

import { activityFacts, eventEvidenceValue } from "../lib/security-activity";

function activity(): RecentPublicSecurityActivity {
  const previousSnapshot = {
    accountDataHash: "sha256:account-v1",
    deploymentSlot: 100n,
    executableHash: "sha256:executable-v1",
    executableSize: 100,
    fingerprint: "sha256:fingerprint-v1",
    id: "snapshot-v1",
    idl: null,
    idlHash: null,
    idlInstructions: null,
    metadataHash: null,
    observedAt: new Date("2026-09-25T20:00:00Z"),
    observedSlot: 101n,
    programAddress: "Program1111111111111111111111111111111111",
    programDataAddress: "ProgramData111111111111111111111111111111",
    programExecutable: true,
    programId: "program-id",
    programOwner: "Owner11111111111111111111111111111111111",
    sourceReferenceHash: null,
    sourceRepositoryUrl: null,
    sourceRevision: null,
    sourceVerificationStatus: "unavailable" as const,
    trustedFingerprint: null,
    upgradeAuthority: "Authority1111111111111111111111111111111",
    verificationStatus: "unknown" as const,
  };
  const currentSnapshot = {
    ...previousSnapshot,
    accountDataHash: "sha256:account-v2",
    deploymentSlot: 200n,
    executableHash: "sha256:executable-v2",
    fingerprint: "sha256:fingerprint-v2",
    id: "snapshot-v2",
    observedAt: new Date("2026-09-25T21:00:00Z"),
    observedSlot: 201n,
  };
  return {
    currentSnapshot,
    event: {
      currentSnapshotId: currentSnapshot.id,
      detectedAt: currentSnapshot.observedAt,
      evidence: {},
      id: "event-id",
      previousSnapshotId: previousSnapshot.id,
      programId: previousSnapshot.programId,
      severity: "high",
      type: "PROGRAM_UPGRADED",
    },
    previousSnapshot,
    program: {
      address: previousSnapshot.programAddress,
      cluster: "devnet",
      id: previousSnapshot.programId,
      monitoringStatus: "healthy",
      programDataAddress: previousSnapshot.programDataAddress,
    },
  };
}

describe("live security activity presentation", () => {
  it("derives facts from the stored snapshot pair", () => {
    const facts = activityFacts(activity());
    expect(facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Executable", state: "changed" }),
        expect.objectContaining({ label: "Deployment", state: "changed" }),
        expect.objectContaining({ label: "Authority", state: "unchanged" }),
      ]),
    );
  });

  it("uses the current stored executable hash as event evidence", () => {
    expect(eventEvidenceValue(activity())).toContain("executable-v2");
  });
});
