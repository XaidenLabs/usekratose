import type {
  AccountRead,
  Cluster,
  MonitoredProgram,
  MonitoringStatus,
  SecurityEvent,
  SecurityEventCandidate,
  SnapshotCandidate,
  SnapshotEnrichment,
  VersionSnapshot,
} from "@usekratose/core";

export interface Clock {
  now(): Date;
}

export interface SolanaGateway {
  getAccountInfo(address: string): Promise<AccountRead>;
}

export interface ProgramIntelligenceGateway {
  retrieve(programAddress: string): Promise<SnapshotEnrichment>;
}

export interface CreateProgramInput {
  readonly address: string;
  readonly cluster: Cluster;
  readonly programDataAddress: string;
  readonly status: MonitoringStatus;
}

export interface PersistedTransition {
  readonly events: readonly SecurityEvent[];
  readonly inserted: boolean;
  readonly outcome: "duplicate" | "inserted" | "stale";
  readonly snapshot: VersionSnapshot;
}

export interface ProgramStore {
  addOrganizationMonitor(
    organizationId: string,
    programId: string,
  ): Promise<void>;
  createOrGetProgram(input: CreateProgramInput): Promise<MonitoredProgram>;
  getLatestSnapshot(programId: string): Promise<VersionSnapshot | null>;
  getProgram(programId: string): Promise<MonitoredProgram | null>;
  listActivePrograms(cluster: Cluster): Promise<readonly MonitoredProgram[]>;
  persistBaseline(
    programId: string,
    candidate: SnapshotCandidate,
  ): Promise<VersionSnapshot>;
  persistTransition(
    programId: string,
    previousSnapshotId: string,
    candidate: SnapshotCandidate,
    events: readonly SecurityEventCandidate[],
  ): Promise<PersistedTransition>;
  recordReconciliation(
    programId: string,
    status: MonitoringStatus,
    reconciledAt: Date,
  ): Promise<void>;
  setMonitoringStatus(
    programId: string,
    status: MonitoringStatus,
  ): Promise<void>;
}

export interface ApiKeyRecord {
  readonly id: string;
  readonly keyPrefix: string;
  readonly name: string;
  readonly projectId: string;
  readonly revokedAt: Date | null;
}

export interface ApiAccessStore {
  consumeRateLimit(input: {
    readonly apiKeyId: string;
    readonly limit: number;
    readonly windowStartedAt: Date;
  }): Promise<{ readonly allowed: boolean; readonly remaining: number }>;
  createApiKey(input: {
    readonly keyHash: string;
    readonly keyPrefix: string;
    readonly name: string;
    readonly projectId: string;
  }): Promise<ApiKeyRecord>;
  findApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | null>;
  logApiRequest(input: {
    readonly apiKeyId: string | null;
    readonly durationMs: number;
    readonly method: string;
    readonly path: string;
    readonly projectId: string | null;
    readonly requestId: string;
    readonly statusCode: number;
  }): Promise<void>;
  revokeApiKey(apiKeyId: string, projectId: string): Promise<boolean>;
  touchApiKey(apiKeyId: string, usedAt: Date): Promise<void>;
}

export const systemClock: Clock = {
  now: () => new Date(),
};
