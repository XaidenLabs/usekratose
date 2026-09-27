import { createHash } from "node:crypto";

import type {
  NormalizedIdl,
  ResolvedDeployment,
  SourceReference,
  SourceVerificationStatus,
  SnapshotCandidate,
  VerificationStatus,
  VersionSnapshot,
} from "./domain.js";
import { canonicalizeJson, normalizeIdl } from "./idl-intelligence.js";

function sha256(bytes: Uint8Array | string): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function hashCanonicalJson(value: unknown): string {
  return sha256(JSON.stringify(canonicalizeJson(value)));
}

export function createIdlEvidence(idl: unknown): {
  readonly hash: string;
  readonly instructions: readonly string[];
  readonly normalized: NormalizedIdl;
} {
  const normalized = normalizeIdl(idl);

  return {
    hash: hashCanonicalJson(normalized),
    instructions: normalized.instructions.map(
      (instruction) => instruction.name,
    ),
    normalized,
  };
}

export interface SnapshotEnrichment {
  readonly idl?: unknown | null;
  readonly metadata?: unknown | null;
  readonly source?: SourceReference | null;
  readonly sourceReference?: string;
  readonly trustedFingerprint?: string | null;
  readonly verificationStatus?: VerificationStatus;
}

interface SnapshotState {
  readonly accountDataHash: string;
  readonly deploymentSlot: bigint;
  readonly executableHash: string;
  readonly executableSize: number;
  readonly idlHash: string | null;
  readonly idl: NormalizedIdl | null;
  readonly idlInstructions: readonly string[] | null;
  readonly metadataHash: string | null;
  readonly observedAt: Date;
  readonly observedSlot: bigint;
  readonly programAddress: string;
  readonly programDataAddress: string;
  readonly programExecutable: boolean;
  readonly programOwner: string;
  readonly sourceReferenceHash: string | null;
  readonly sourceRepositoryUrl: string | null;
  readonly sourceRevision: string | null;
  readonly sourceVerificationStatus: SourceVerificationStatus;
  readonly trustedFingerprint: string | null;
  readonly upgradeAuthority: string | null;
  readonly verificationStatus: VerificationStatus;
}

function deploymentFingerprint(
  state: Omit<
    SnapshotState,
    "observedAt" | "observedSlot" | "trustedFingerprint" | "verificationStatus"
  >,
): string {
  return hashCanonicalJson({
    accountDataHash: state.accountDataHash,
    deploymentSlot: state.deploymentSlot.toString(),
    executableHash: state.executableHash,
    executableSize: state.executableSize,
    idlHash: state.idlHash,
    metadataHash: state.metadataHash,
    programAddress: state.programAddress,
    programDataAddress: state.programDataAddress,
    programExecutable: state.programExecutable,
    programOwner: state.programOwner,
    sourceReferenceHash: state.sourceReferenceHash,
    sourceRepositoryUrl: state.sourceRepositoryUrl,
    sourceRevision: state.sourceRevision,
    sourceVerificationStatus: state.sourceVerificationStatus,
    upgradeAuthority: state.upgradeAuthority,
  });
}

function finalizeSnapshotState(state: SnapshotState): SnapshotCandidate {
  const fingerprint = deploymentFingerprint(state);
  const trustedFingerprint =
    (state.verificationStatus === "trusted" ||
      state.verificationStatus === "verified") &&
    state.trustedFingerprint === null
      ? fingerprint
      : state.trustedFingerprint;
  const previousTrustNoLongerMatches =
    (state.verificationStatus === "trusted" ||
      state.verificationStatus === "verified") &&
    trustedFingerprint !== null &&
    trustedFingerprint !== fingerprint;

  return {
    ...state,
    fingerprint,
    trustedFingerprint,
    verificationStatus: previousTrustNoLongerMatches
      ? "stale"
      : state.verificationStatus,
  };
}

export function createSnapshotCandidate(input: {
  readonly deployment: ResolvedDeployment;
  readonly enrichment?: SnapshotEnrichment;
  readonly observedAt: Date;
  readonly observedSlot: bigint;
  readonly previous?: VersionSnapshot | null;
}): SnapshotCandidate {
  const idlEvidence =
    input.enrichment?.idl === undefined || input.enrichment.idl === null
      ? null
      : createIdlEvidence(input.enrichment.idl);
  const previous = input.previous ?? null;
  const explicitlyTrustsCurrent =
    input.enrichment?.verificationStatus === "trusted" ||
    input.enrichment?.verificationStatus === "verified";
  const state: SnapshotState = {
    accountDataHash: sha256(input.deployment.accountData),
    deploymentSlot: input.deployment.deploymentSlot,
    executableHash: sha256(input.deployment.executableBytes),
    executableSize: input.deployment.executableBytes.length,
    idl:
      input.enrichment?.idl === undefined
        ? (previous?.idl ?? null)
        : (idlEvidence?.normalized ?? null),
    idlHash:
      input.enrichment?.idl === undefined
        ? (previous?.idlHash ?? null)
        : (idlEvidence?.hash ?? null),
    idlInstructions:
      input.enrichment?.idl === undefined
        ? (previous?.idlInstructions ?? null)
        : (idlEvidence?.instructions ?? null),
    metadataHash:
      input.enrichment?.metadata === undefined
        ? (previous?.metadataHash ?? null)
        : input.enrichment.metadata === null
          ? null
          : hashCanonicalJson(input.enrichment.metadata),
    observedAt: input.observedAt,
    observedSlot: input.observedSlot,
    programAddress: input.deployment.programAddress,
    programDataAddress: input.deployment.programDataAddress,
    programExecutable: true,
    programOwner: input.deployment.programOwner,
    sourceReferenceHash:
      input.enrichment?.source === undefined &&
      input.enrichment?.sourceReference === undefined
        ? (previous?.sourceReferenceHash ?? null)
        : input.enrichment?.source === null
          ? null
          : hashCanonicalJson(
              input.enrichment?.source ?? input.enrichment?.sourceReference,
            ),
    sourceRepositoryUrl:
      input.enrichment?.source === undefined
        ? (previous?.sourceRepositoryUrl ?? null)
        : (input.enrichment.source?.repositoryUrl ?? null),
    sourceRevision:
      input.enrichment?.source === undefined
        ? (previous?.sourceRevision ?? null)
        : (input.enrichment.source?.revision ?? null),
    sourceVerificationStatus:
      input.enrichment?.source === undefined
        ? (previous?.sourceVerificationStatus ?? "unavailable")
        : (input.enrichment.source?.verificationStatus ?? "unavailable"),
    trustedFingerprint:
      input.enrichment?.trustedFingerprint !== undefined
        ? input.enrichment.trustedFingerprint
        : explicitlyTrustsCurrent
          ? null
          : (previous?.trustedFingerprint ?? null),
    upgradeAuthority: input.deployment.upgradeAuthority,
    verificationStatus:
      input.enrichment?.verificationStatus ??
      previous?.verificationStatus ??
      "unknown",
  };

  return finalizeSnapshotState(state);
}

export function createOwnerChangeSnapshot(input: {
  readonly observedAt: Date;
  readonly observedSlot: bigint;
  readonly previous: VersionSnapshot;
  readonly programExecutable?: boolean;
  readonly programOwner: string;
}): SnapshotCandidate {
  return finalizeSnapshotState({
    accountDataHash: input.previous.accountDataHash,
    deploymentSlot: input.previous.deploymentSlot,
    executableHash: input.previous.executableHash,
    executableSize: input.previous.executableSize,
    idl: input.previous.idl,
    idlHash: input.previous.idlHash,
    idlInstructions: input.previous.idlInstructions,
    metadataHash: input.previous.metadataHash,
    observedAt: input.observedAt,
    observedSlot: input.observedSlot,
    programAddress: input.previous.programAddress,
    programDataAddress: input.previous.programDataAddress,
    programExecutable:
      input.programExecutable ?? input.previous.programExecutable,
    programOwner: input.programOwner,
    sourceReferenceHash: input.previous.sourceReferenceHash,
    sourceRepositoryUrl: input.previous.sourceRepositoryUrl,
    sourceRevision: input.previous.sourceRevision,
    sourceVerificationStatus: input.previous.sourceVerificationStatus,
    trustedFingerprint: input.previous.trustedFingerprint,
    upgradeAuthority: input.previous.upgradeAuthority,
    verificationStatus: input.previous.verificationStatus,
  });
}

export function createExecutableStateChangeSnapshot(input: {
  readonly observedAt: Date;
  readonly observedSlot: bigint;
  readonly previous: VersionSnapshot;
  readonly programExecutable: boolean;
}): SnapshotCandidate {
  return finalizeSnapshotState({
    accountDataHash: input.previous.accountDataHash,
    deploymentSlot: input.previous.deploymentSlot,
    executableHash: input.previous.executableHash,
    executableSize: input.previous.executableSize,
    idl: input.previous.idl,
    idlHash: input.previous.idlHash,
    idlInstructions: input.previous.idlInstructions,
    metadataHash: input.previous.metadataHash,
    observedAt: input.observedAt,
    observedSlot: input.observedSlot,
    programAddress: input.previous.programAddress,
    programDataAddress: input.previous.programDataAddress,
    programExecutable: input.programExecutable,
    programOwner: input.previous.programOwner,
    sourceReferenceHash: input.previous.sourceReferenceHash,
    sourceRepositoryUrl: input.previous.sourceRepositoryUrl,
    sourceRevision: input.previous.sourceRevision,
    sourceVerificationStatus: input.previous.sourceVerificationStatus,
    trustedFingerprint: input.previous.trustedFingerprint,
    upgradeAuthority: input.previous.upgradeAuthority,
    verificationStatus: input.previous.verificationStatus,
  });
}
