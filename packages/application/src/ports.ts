import type {
  AccountRead,
  Cluster,
  MonitoredProgram,
  MonitoringStatus,
  SecurityEvent,
  SecurityEventCandidate,
  SnapshotCandidate,
  VersionSnapshot,
} from "@usekratose/core";

export interface Clock {
  now(): Date;
}

export interface SolanaGateway {
  getAccountInfo(address: string): Promise<AccountRead>;
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

export const systemClock: Clock = {
  now: () => new Date(),
};
