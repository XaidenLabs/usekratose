import { randomUUID } from "node:crypto";

import type {
  AccountRead,
  ChangeEvent,
  ChangeEventCandidate,
  Cluster,
  MonitoredProgram,
  MonitoringStatus,
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
  public readonly events: ChangeEvent[] = [];
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
    candidate: SnapshotCandidate,
    eventCandidate: ChangeEventCandidate,
  ): Promise<PersistedTransition> {
    const existing = this.findSnapshot(
      eventCandidate.programId,
      candidate.fingerprint,
    );
    if (existing !== undefined) {
      const event = this.events.find(
        (item) =>
          item.fromSnapshotId === eventCandidate.fromSnapshotId &&
          item.toSnapshotId === existing.id,
      );
      if (event === undefined) throw new Error("Missing idempotent event");
      return { event, inserted: false, snapshot: existing };
    }

    const snapshot = await this.persistBaseline(
      eventCandidate.programId,
      candidate,
    );
    const event: ChangeEvent = {
      ...eventCandidate,
      id: randomUUID(),
      toSnapshotId: snapshot.id,
    };
    this.events.push(event);
    return { event, inserted: true, snapshot };
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
