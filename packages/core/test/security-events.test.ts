import { describe, expect, it } from "vitest";

import { createSecurityEventCandidates, diffSnapshots } from "../src/diff.js";
import type { SnapshotCandidate, VersionSnapshot } from "../src/domain.js";

const detectedAt = new Date("2026-09-18T00:00:00Z");

function snapshot(overrides: Partial<VersionSnapshot> = {}): VersionSnapshot {
  return {
    accountDataHash: "sha256:account-v1",
    deploymentSlot: 100n,
    executableHash: "sha256:executable-v1",
    executableSize: 10,
    fingerprint: "sha256:fingerprint-v1",
    id: "snapshot-v1",
    idl: null,
    idlHash: null,
    idlInstructions: null,
    metadataHash: null,
    observedAt: new Date("2026-09-17T00:00:00Z"),
    observedSlot: 101n,
    programAddress: "program-address",
    programDataAddress: "programdata-address",
    programExecutable: true,
    programId: "program-id",
    programOwner: "loader-v3",
    sourceReferenceHash: null,
    sourceRepositoryUrl: null,
    sourceRevision: null,
    sourceVerificationStatus: "unavailable",
    trustedFingerprint: null,
    upgradeAuthority: "authority-a",
    verificationStatus: "unknown",
    ...overrides,
  };
}

function asCandidate(value: VersionSnapshot): SnapshotCandidate {
  const { id: _id, programId: _programId, ...candidate } = value;
  return candidate;
}

function eventTypes(
  previous: VersionSnapshot,
  current: SnapshotCandidate,
): readonly string[] {
  return createSecurityEventCandidates(previous, current, detectedAt).map(
    (event) => event.type,
  );
}

describe("Milestone 2 security event rules", () => {
  it("emits no events for identical snapshots", () => {
    const previous = snapshot();
    expect(eventTypes(previous, asCandidate(previous))).toEqual([]);
  });

  it("emits a high program upgrade for an executable change", () => {
    const previous = snapshot();
    const current = asCandidate(
      snapshot({
        accountDataHash: "sha256:account-v2",
        deploymentSlot: 200n,
        executableHash: "sha256:executable-v2",
        fingerprint: "sha256:fingerprint-v2",
        id: "snapshot-v2",
      }),
    );
    const [event] = createSecurityEventCandidates(
      previous,
      current,
      detectedAt,
    );

    expect(event?.type).toBe("PROGRAM_UPGRADED");
    expect(event?.severity).toBe("high");
    expect(event?.evidence).toMatchObject({
      deploymentSlotChanged: true,
      executableChanged: true,
    });
  });

  it("emits an info upgrade when only the deployment slot changes", () => {
    const previous = snapshot();
    const current = asCandidate(
      snapshot({
        deploymentSlot: 200n,
        fingerprint: "sha256:fingerprint-v2",
        id: "snapshot-v2",
      }),
    );
    const [event] = createSecurityEventCandidates(
      previous,
      current,
      detectedAt,
    );

    expect(event).toMatchObject({ severity: "info", type: "PROGRAM_UPGRADED" });
    expect(event?.evidence).toMatchObject({ executableChanged: false });
  });

  it("emits a high authority event for an authority change", () => {
    const previous = snapshot();
    const current = asCandidate(
      snapshot({
        fingerprint: "sha256:fingerprint-v2",
        id: "snapshot-v2",
        upgradeAuthority: "authority-b",
      }),
    );
    const [event] = createSecurityEventCandidates(
      previous,
      current,
      detectedAt,
    );

    expect(event).toMatchObject({
      severity: "high",
      type: "AUTHORITY_CHANGED",
    });
  });

  it("emits an info event when a program becomes immutable", () => {
    const previous = snapshot();
    const current = asCandidate(
      snapshot({
        fingerprint: "sha256:fingerprint-v2",
        id: "snapshot-v2",
        upgradeAuthority: null,
      }),
    );
    expect(
      createSecurityEventCandidates(previous, current, detectedAt),
    ).toMatchObject([{ severity: "info", type: "PROGRAM_BECAME_IMMUTABLE" }]);
  });

  it("records an executable-state transition", () => {
    const previous = snapshot();
    const current = asCandidate(
      snapshot({
        fingerprint: "sha256:fingerprint-v2",
        id: "snapshot-v2",
        programExecutable: false,
      }),
    );
    expect(diffSnapshots(previous, current).executableStateChanged).toBe(true);
    expect(
      createSecurityEventCandidates(previous, current, detectedAt)[0],
    ).toMatchObject({ severity: "high", type: "PROGRAM_UPGRADED" });
  });

  it("emits upgrade and authority events for a combined change", () => {
    const previous = snapshot();
    const current = asCandidate(
      snapshot({
        executableHash: "sha256:executable-v2",
        fingerprint: "sha256:fingerprint-v2",
        id: "snapshot-v2",
        upgradeAuthority: "authority-b",
      }),
    );

    expect(eventTypes(previous, current)).toEqual([
      "PROGRAM_UPGRADED",
      "AUTHORITY_CHANGED",
    ]);
  });

  it("emits a critical owner event", () => {
    const previous = snapshot();
    const current = asCandidate(
      snapshot({
        fingerprint: "sha256:fingerprint-v2",
        id: "snapshot-v2",
        programOwner: "unexpected-loader",
      }),
    );
    const [event] = createSecurityEventCandidates(
      previous,
      current,
      detectedAt,
    );

    expect(event).toMatchObject({
      severity: "critical",
      type: "OWNER_CHANGED",
    });
  });

  it("emits a medium IDL event", () => {
    const previous = snapshot({
      idlHash: "sha256:idl-v1",
      idlInstructions: ["initialize"],
    });
    const current = asCandidate(
      snapshot({
        fingerprint: "sha256:fingerprint-v2",
        id: "snapshot-v2",
        idlHash: "sha256:idl-v2",
        idlInstructions: ["initialize"],
      }),
    );

    expect(
      createSecurityEventCandidates(previous, current, detectedAt)[0],
    ).toMatchObject({
      severity: "medium",
      type: "IDL_CHANGED",
    });
  });

  it("emits instruction-added evidence and elevates privileged names", () => {
    const previous = snapshot({
      idlHash: "sha256:idl-v1",
      idlInstructions: ["initialize"],
    });
    const current = asCandidate(
      snapshot({
        fingerprint: "sha256:fingerprint-v2",
        id: "snapshot-v2",
        idlHash: "sha256:idl-v2",
        idlInstructions: ["initialize", "setAdmin"],
      }),
    );
    const events = createSecurityEventCandidates(previous, current, detectedAt);
    const added = events.find((event) => event.type === "INSTRUCTION_ADDED");

    expect(added).toMatchObject({ severity: "high" });
    expect(added?.evidence).toEqual({
      instructions: ["setAdmin"],
      privilegedLooking: ["setAdmin"],
    });
  });

  it("uses medium severity for a non-privileged instruction addition", () => {
    const previous = snapshot({
      idlHash: "sha256:idl-v1",
      idlInstructions: ["initialize"],
    });
    const current = asCandidate(
      snapshot({
        fingerprint: "sha256:fingerprint-v2",
        id: "snapshot-v2",
        idlHash: "sha256:idl-v2",
        idlInstructions: ["deposit", "initialize"],
      }),
    );
    const added = createSecurityEventCandidates(
      previous,
      current,
      detectedAt,
    ).find((event) => event.type === "INSTRUCTION_ADDED");

    expect(added).toMatchObject({ severity: "medium" });
  });

  it("emits a medium instruction-removed event", () => {
    const previous = snapshot({
      idlHash: "sha256:idl-v1",
      idlInstructions: ["initialize", "deposit"],
    });
    const current = asCandidate(
      snapshot({
        fingerprint: "sha256:fingerprint-v2",
        id: "snapshot-v2",
        idlHash: "sha256:idl-v2",
        idlInstructions: ["initialize"],
      }),
    );
    const removed = createSecurityEventCandidates(
      previous,
      current,
      detectedAt,
    ).find((event) => event.type === "INSTRUCTION_REMOVED");

    expect(removed).toMatchObject({ severity: "medium" });
    expect(removed?.evidence).toEqual({ instructions: ["deposit"] });
  });

  it("emits a high instruction-change event for signer escalation", () => {
    const previous = snapshot({
      idl: {
        accountTypes: [],
        errors: [],
        instructions: [
          {
            accounts: [
              {
                name: "admin",
                optional: false,
                signer: false,
                writable: false,
              },
            ],
            arguments: [],
            name: "configure",
          },
        ],
      },
      idlHash: "sha256:idl-v1",
      idlInstructions: ["configure"],
    });
    const current = asCandidate(
      snapshot({
        fingerprint: "sha256:fingerprint-v2",
        id: "snapshot-v2",
        idl: {
          accountTypes: [],
          errors: [],
          instructions: [
            {
              accounts: [
                {
                  name: "admin",
                  optional: false,
                  signer: true,
                  writable: false,
                },
              ],
              arguments: [],
              name: "configure",
            },
          ],
        },
        idlHash: "sha256:idl-v2",
        idlInstructions: ["configure"],
      }),
    );
    expect(
      createSecurityEventCandidates(previous, current, detectedAt),
    ).toContainEqual(
      expect.objectContaining({
        severity: "high",
        type: "INSTRUCTION_CHANGED",
      }),
    );
  });

  it("marks a previous trusted fingerprint stale", () => {
    const previous = snapshot({
      trustedFingerprint: "sha256:fingerprint-v1",
      verificationStatus: "verified",
    });
    const current = asCandidate(
      snapshot({
        executableHash: "sha256:executable-v2",
        fingerprint: "sha256:fingerprint-v2",
        id: "snapshot-v2",
        trustedFingerprint: "sha256:fingerprint-v1",
        verificationStatus: "stale",
      }),
    );

    expect(eventTypes(previous, current)).toContain("VERIFICATION_STALE");
  });

  it("records deployment, ProgramData, metadata and source-reference diffs", () => {
    const previous = snapshot({
      metadataHash: "sha256:metadata-v1",
      sourceReferenceHash: "sha256:source-v1",
    });
    const current = asCandidate(
      snapshot({
        deploymentSlot: 200n,
        fingerprint: "sha256:fingerprint-v2",
        id: "snapshot-v2",
        metadataHash: "sha256:metadata-v2",
        programDataAddress: "programdata-address-v2",
        sourceReferenceHash: "sha256:source-v2",
      }),
    );

    expect(diffSnapshots(previous, current)).toMatchObject({
      deploymentSlotChanged: true,
      metadataChanged: true,
      programDataChanged: true,
      sourceReferenceChanged: true,
    });
    expect(eventTypes(previous, current)).toContain("PROGRAM_UPGRADED");
  });
});
