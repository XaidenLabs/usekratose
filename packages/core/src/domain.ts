export const SUPPORTED_CLUSTERS = ["devnet", "mainnet-beta"] as const;

export type Cluster = (typeof SUPPORTED_CLUSTERS)[number];
export type ProgramId = string;
export type SnapshotId = string;

export type MonitoringStatus =
  "baselining" | "healthy" | "degraded" | "unsupported";

export interface RpcAccount {
  readonly data: Uint8Array;
  readonly executable: boolean;
  readonly lamports: bigint;
  readonly owner: string;
}

export interface AccountRead {
  readonly account: RpcAccount | null;
  readonly contextSlot: bigint;
}

export interface ResolvedDeployment {
  readonly accountData: Uint8Array;
  readonly deploymentSlot: bigint;
  readonly executableBytes: Uint8Array;
  readonly programAddress: string;
  readonly programDataAddress: string;
  readonly programOwner: string;
  readonly upgradeAuthority: string | null;
}

export type VerificationStatus = "unknown" | "trusted" | "verified" | "stale";
export type SourceVerificationStatus =
  "unavailable" | "unverified" | "verified";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface NormalizedIdlAccountRequirement {
  readonly name: string;
  readonly optional: boolean;
  readonly signer: boolean;
  readonly writable: boolean;
}

export interface NormalizedIdlArgument {
  readonly name: string;
  readonly type: JsonValue;
}

export interface NormalizedIdlInstruction {
  readonly accounts: readonly NormalizedIdlAccountRequirement[];
  readonly arguments: readonly NormalizedIdlArgument[];
  readonly name: string;
}

export interface NormalizedIdlAccountType {
  readonly name: string;
  readonly type: JsonValue;
}

export interface NormalizedIdlError {
  readonly code: number | null;
  readonly message: string | null;
  readonly name: string;
}

export interface NormalizedIdl {
  readonly accountTypes: readonly NormalizedIdlAccountType[];
  readonly errors: readonly NormalizedIdlError[];
  readonly instructions: readonly NormalizedIdlInstruction[];
}

export interface SourceReference {
  readonly repositoryUrl: string;
  readonly revision: string | null;
  readonly verificationStatus: SourceVerificationStatus;
}

export interface SnapshotCandidate {
  readonly accountDataHash: string;
  readonly deploymentSlot: bigint;
  readonly executableHash: string;
  readonly executableSize: number;
  readonly fingerprint: string;
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

export interface VersionSnapshot extends SnapshotCandidate {
  readonly id: SnapshotId;
  readonly programId: ProgramId;
}

export type SecurityEventType =
  | "PROGRAM_UPGRADED"
  | "AUTHORITY_CHANGED"
  | "PROGRAM_BECAME_IMMUTABLE"
  | "OWNER_CHANGED"
  | "IDL_CHANGED"
  | "INSTRUCTION_ADDED"
  | "INSTRUCTION_REMOVED"
  | "INSTRUCTION_CHANGED"
  | "VERIFICATION_STALE";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export type SecurityEvidence = Readonly<Record<string, unknown>>;

export interface SecurityEvent {
  readonly currentSnapshotId: string;
  readonly detectedAt: Date;
  readonly evidence: SecurityEvidence;
  readonly id: string;
  readonly previousSnapshotId: string;
  readonly programId: string;
  readonly severity: Severity;
  readonly type: SecurityEventType;
}

export interface SecurityEventCandidate {
  readonly currentFingerprint: string;
  readonly detectedAt: Date;
  readonly evidence: SecurityEvidence;
  readonly previousSnapshotId: string;
  readonly programId: string;
  readonly ruleEngineVersion: "2";
  readonly severity: Severity;
  readonly type: SecurityEventType;
}

export interface SnapshotDiff {
  readonly accountDataChanged: boolean;
  readonly becameImmutable: boolean;
  readonly deploymentSlotChanged: boolean;
  readonly executableChanged: boolean;
  readonly executableStateChanged: boolean;
  readonly idlChanged: boolean;
  readonly idlChanges: IdlChanges;
  readonly instructionsAdded: readonly string[];
  readonly instructionsRemoved: readonly string[];
  readonly metadataChanged: boolean;
  readonly ownerChanged: boolean;
  readonly programDataChanged: boolean;
  readonly sourceReferenceChanged: boolean;
  readonly upgradeAuthorityChanged: boolean;
  readonly verificationBecameStale: boolean;
}

export interface BooleanRequirementChange {
  readonly account: string;
  readonly current: boolean;
  readonly previous: boolean;
}

export interface InstructionSchemaChange {
  readonly accountsAdded: readonly NormalizedIdlAccountRequirement[];
  readonly accountsRemoved: readonly NormalizedIdlAccountRequirement[];
  readonly argumentsChanged: boolean;
  readonly currentArguments: readonly NormalizedIdlArgument[];
  readonly name: string;
  readonly optionalChanges: readonly BooleanRequirementChange[];
  readonly previousArguments: readonly NormalizedIdlArgument[];
  readonly signerChanges: readonly BooleanRequirementChange[];
  readonly writableChanges: readonly BooleanRequirementChange[];
}

export interface NamedSchemaChange {
  readonly current: JsonValue | NormalizedIdlError | null;
  readonly name: string;
  readonly previous: JsonValue | NormalizedIdlError | null;
}

export interface IdlChanges {
  readonly accountTypesChanged: readonly NamedSchemaChange[];
  readonly errorsChanged: readonly NamedSchemaChange[];
  readonly instructionSchemasChanged: readonly InstructionSchemaChange[];
}

export interface MonitoredProgram {
  readonly address: string;
  readonly cluster: Cluster;
  readonly id: ProgramId;
  readonly monitoringStatus: MonitoringStatus;
  readonly programDataAddress: string;
}

export type ReconciliationReason =
  "baseline" | "poll" | "startup" | "websocket" | "websocket-reconnect";

export type ReconciliationResult =
  | { readonly kind: "no-change"; readonly fingerprint: string }
  | {
      readonly events: readonly SecurityEvent[];
      readonly kind: "change";
      readonly snapshot: VersionSnapshot;
    };
