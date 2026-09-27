import { randomUUID } from "node:crypto";

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
import type {
  CreateProgramInput,
  PersistedTransition,
  ProgramStore,
  SolanaGateway,
} from "../src/ports.js";

export class FakeGateway implements SolanaGateway {
  public readonly accounts = new Map<string, AccountRead>();

  public async getAccountInfo(address: string): Promise<AccountRead> {
    return this.accounts.get(address) ?? { account: null, contextSlot: 0n };
  }
}

export class InMemoryProgramStore implements ProgramStore {
  public readonly events: SecurityEvent[] = [];
  public readonly monitors = new Set<string>();
  public readonly programs = new Map<string, MonitoredProgram>();
  public readonly snapshots = new Map<string, VersionSnapshot[]>();

  public async addOrganizationMonitor(
    organizationId: string,
    programId: string,
  ): Promise<void> {
    this.monitors.add(`${organizationId}:${programId}`);
  }

  public async createOrGetProgram(
    input: CreateProgramInput,
  ): Promise<MonitoredProgram> {
    const existing = [...this.programs.values()].find(
      (program) =>
        program.address === input.address && program.cluster === input.cluster,
    );
    if (existing !== undefined) return existing;

    const program: MonitoredProgram = {
      id: randomUUID(),
      ...input,
      monitoringStatus: input.status,
    };
    this.programs.set(program.id, program);
    return program;
  }

  public async getLatestSnapshot(
    programId: string,
  ): Promise<VersionSnapshot | null> {
    return this.snapshots.get(programId)?.at(-1) ?? null;
  }

  public async getProgram(programId: string): Promise<MonitoredProgram | null> {
    return this.programs.get(programId) ?? null;
  }

  public async listActivePrograms(
    cluster: Cluster,
  ): Promise<readonly MonitoredProgram[]> {
    return [...this.programs.values()].filter(
      (program) => program.cluster === cluster,
    );
  }

  public async persistBaseline(
    programId: string,
    candidate: SnapshotCandidate,
  ): Promise<VersionSnapshot> {
    const existing = this.findSnapshot(programId, candidate.fingerprint);
    if (existing !== undefined) return existing;
    const snapshot = { ...candidate, id: randomUUID(), programId };
    this.snapshots.set(programId, [
      ...(this.snapshots.get(programId) ?? []),
      snapshot,
    ]);
    return snapshot;
  }

  public async persistTransition(
    programId: string,
    previousSnapshotId: string,
    candidate: SnapshotCandidate,
    eventCandidates: readonly SecurityEventCandidate[],
  ): Promise<PersistedTransition> {
    const latest = this.snapshots.get(programId)?.at(-1);
    if (latest === undefined) {
      throw new Error("Cannot persist a transition without a baseline");
    }
    if (latest.fingerprint === candidate.fingerprint) {
      const events = this.events.filter(
        (item) => item.currentSnapshotId === latest.id,
      );
      return {
        events,
        inserted: false,
        outcome: "duplicate",
        snapshot: latest,
      };
    }
    if (latest.id !== previousSnapshotId) {
      return {
        events: [],
        inserted: false,
        outcome: "stale",
        snapshot: latest,
      };
    }

    const snapshot = { ...candidate, id: randomUUID(), programId };
    this.snapshots.set(programId, [
      ...(this.snapshots.get(programId) ?? []),
      snapshot,
    ]);
    const program = this.programs.get(programId);
    if (program !== undefined) {
      this.programs.set(programId, {
        ...program,
        programDataAddress: candidate.programDataAddress,
      });
    }
    for (const eventCandidate of eventCandidates) {
      const duplicate = this.events.some(
        (event) =>
          event.previousSnapshotId === eventCandidate.previousSnapshotId &&
          event.currentSnapshotId === snapshot.id &&
          event.type === eventCandidate.type,
      );
      if (!duplicate) {
        this.events.push({
          currentSnapshotId: snapshot.id,
          detectedAt: eventCandidate.detectedAt,
          evidence: eventCandidate.evidence,
          id: randomUUID(),
          previousSnapshotId: eventCandidate.previousSnapshotId,
          programId: eventCandidate.programId,
          severity: eventCandidate.severity,
          type: eventCandidate.type,
        });
      }
    }
    return {
      events: this.events.filter(
        (event) => event.currentSnapshotId === snapshot.id,
      ),
      inserted: true,
      outcome: "inserted",
      snapshot,
    };
  }

  public async recordReconciliation(
    programId: string,
    status: MonitoringStatus,
    _reconciledAt: Date,
  ): Promise<void> {
    await this.setMonitoringStatus(programId, status);
  }

  public async setMonitoringStatus(
    programId: string,
    status: MonitoringStatus,
  ): Promise<void> {
    const program = this.programs.get(programId);
    if (program !== undefined) {
      this.programs.set(programId, { ...program, monitoringStatus: status });
    }
  }

  public seedProgram(input: {
    readonly address: string;
    readonly cluster?: Cluster;
    readonly programDataAddress: string;
  }): MonitoredProgram {
    const program: MonitoredProgram = {
      address: input.address,
      cluster: input.cluster ?? "devnet",
      id: randomUUID(),
      monitoringStatus: "healthy",
      programDataAddress: input.programDataAddress,
    };
    this.programs.set(program.id, program);
    return program;
  }

  private findSnapshot(
    programId: string,
    fingerprint: string,
  ): VersionSnapshot | undefined {
    return this.snapshots
      .get(programId)
      ?.find((snapshot) => snapshot.fingerprint === fingerprint);
  }
}
