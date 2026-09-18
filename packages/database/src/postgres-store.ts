import type {
  CreateProgramInput,
  PersistedTransition,
  ProgramStore,
} from "@usekratose/application";
import type {
  ChangeEvent,
  ChangeEventCandidate,
  MonitoredProgram,
  MonitoringStatus,
  SnapshotCandidate,
  VersionSnapshot,
} from "@usekratose/core";
import postgres, { type Sql, type TransactionSql } from "postgres";

type QuerySql = Sql | TransactionSql;

interface ProgramRow {
  address: string;
  cluster: "devnet" | "mainnet-beta";
  id: string;
  monitoring_status: MonitoringStatus;
  programdata_address: string;
}

interface SnapshotRow {
  account_data_hash: string;
  deployment_slot: string;
  executable_hash: string;
  executable_size: number;
  fingerprint: string;
  id: string;
  observed_at: Date;
  observed_slot: string;
  program_address: string;
  program_id: string;
  programdata_address: string;
  upgrade_authority: string | null;
}

interface EventRow {
  detected_at: Date;
  event_types: ChangeEvent["eventTypes"];
  facts: ChangeEvent["facts"];
  from_snapshot_id: string;
  id: string;
  program_id: string;
  rule_engine_version: "1";
  severity: ChangeEvent["severity"];
  to_snapshot_id: string;
}

function mapProgram(row: ProgramRow): MonitoredProgram {
  return {
    address: row.address,
    cluster: row.cluster,
    id: row.id,
    monitoringStatus: row.monitoring_status,
    programDataAddress: row.programdata_address,
  };
}

function mapSnapshot(row: SnapshotRow): VersionSnapshot {
  return {
    accountDataHash: row.account_data_hash,
    deploymentSlot: BigInt(row.deployment_slot),
    executableHash: row.executable_hash,
    executableSize: row.executable_size,
    fingerprint: row.fingerprint,
    id: row.id,
    observedAt: row.observed_at,
    observedSlot: BigInt(row.observed_slot),
    programAddress: row.program_address,
    programDataAddress: row.programdata_address,
    programId: row.program_id,
    upgradeAuthority: row.upgrade_authority,
  };
}

function mapEvent(row: EventRow): ChangeEvent {
  return {
    detectedAt: row.detected_at,
    eventTypes: row.event_types,
    facts: row.facts,
    fromSnapshotId: row.from_snapshot_id,
    id: row.id,
    programId: row.program_id,
    ruleEngineVersion: row.rule_engine_version,
    severity: row.severity,
    toFingerprint: "",
    toSnapshotId: row.to_snapshot_id,
  };
}

export class PostgresProgramStore implements ProgramStore {
  public constructor(private readonly sql: Sql) {}

  public async addOrganizationMonitor(
    organizationId: string,
    programId: string,
  ): Promise<void> {
    await this.sql`
      INSERT INTO organization_program_monitors (organization_id, program_id)
      VALUES (${organizationId}, ${programId})
      ON CONFLICT DO NOTHING
    `;
  }

  public async createOrGetProgram(
    input: CreateProgramInput,
  ): Promise<MonitoredProgram> {
    const [row] = await this.sql<ProgramRow[]>`
      INSERT INTO programs (
        cluster, address, programdata_address, monitoring_status
      ) VALUES (
        ${input.cluster}, ${input.address}, ${input.programDataAddress}, ${input.status}
      )
      ON CONFLICT (cluster, address) DO UPDATE SET
        programdata_address = EXCLUDED.programdata_address,
        updated_at = now()
      RETURNING id, cluster, address, programdata_address, monitoring_status
    `;
    if (row === undefined) throw new Error("Failed to create or load program");
    return mapProgram(row);
  }

  public async getLatestSnapshot(
    programId: string,
  ): Promise<VersionSnapshot | null> {
    const [row] = await this.sql<SnapshotRow[]>`
      SELECT * FROM version_snapshots
      WHERE program_id = ${programId}
      ORDER BY observed_slot DESC, id DESC
      LIMIT 1
    `;
    return row === undefined ? null : mapSnapshot(row);
  }

  public async getProgram(programId: string): Promise<MonitoredProgram | null> {
    const [row] = await this.sql<ProgramRow[]>`
      SELECT id, cluster, address, programdata_address, monitoring_status
      FROM programs WHERE id = ${programId}
    `;
    return row === undefined ? null : mapProgram(row);
  }

  public async listActivePrograms(
    cluster: MonitoredProgram["cluster"],
  ): Promise<readonly MonitoredProgram[]> {
    const rows = await this.sql<ProgramRow[]>`
      SELECT id, cluster, address, programdata_address, monitoring_status
      FROM programs
      WHERE monitoring_status != 'unsupported' AND cluster = ${cluster}
      ORDER BY created_at ASC
    `;
    return rows.map(mapProgram);
  }

  public async persistBaseline(
    programId: string,
    candidate: SnapshotCandidate,
  ): Promise<VersionSnapshot> {
    const [row] = await this.insertSnapshot(this.sql, programId, candidate);
    if (row === undefined) {
      const existing = await this.findSnapshotByFingerprint(
        this.sql,
        programId,
        candidate.fingerprint,
      );
      if (existing === null) throw new Error("Failed to persist baseline");
      return existing;
    }
    return mapSnapshot(row);
  }

  public async persistTransition(
    candidate: SnapshotCandidate,
    event: ChangeEventCandidate,
  ): Promise<PersistedTransition> {
    return this.sql.begin(async (transaction) => {
      const [snapshotRow] = await this.insertSnapshot(
        transaction,
        event.programId,
        candidate,
      );
      const snapshot =
        snapshotRow === undefined
          ? await this.findSnapshotByFingerprint(
              transaction,
              event.programId,
              candidate.fingerprint,
            )
          : mapSnapshot(snapshotRow);
      if (snapshot === null)
        throw new Error("Failed to persist transition snapshot");

      const [eventRow] = await transaction<EventRow[]>`
        INSERT INTO change_events (
          program_id, from_snapshot_id, to_snapshot_id, event_types,
          severity, facts, rule_engine_version, detected_at
        ) VALUES (
          ${event.programId}, ${event.fromSnapshotId}, ${snapshot.id},
          ${transaction.array([...event.eventTypes])}, ${event.severity},
          ${JSON.stringify(event.facts)}::jsonb, ${event.ruleEngineVersion},
          ${event.detectedAt}
        )
        ON CONFLICT (from_snapshot_id, to_snapshot_id) DO NOTHING
        RETURNING *
      `;
      const inserted = eventRow !== undefined;
      const persistedEvent =
        eventRow ??
        (
          await transaction<EventRow[]>`
            SELECT * FROM change_events
            WHERE from_snapshot_id = ${event.fromSnapshotId}
              AND to_snapshot_id = ${snapshot.id}
          `
        )[0];
      if (persistedEvent === undefined)
        throw new Error("Failed to persist change event");

      return {
        event: {
          ...mapEvent(persistedEvent),
          toFingerprint: candidate.fingerprint,
        },
        inserted,
        snapshot,
      };
    });
  }

  public async recordReconciliation(
    programId: string,
    status: MonitoringStatus,
    reconciledAt: Date,
  ): Promise<void> {
    await this.sql`
      UPDATE programs SET
        monitoring_status = ${status},
        last_reconciled_at = ${reconciledAt},
        updated_at = now()
      WHERE id = ${programId}
    `;
  }

  public async setMonitoringStatus(
    programId: string,
    status: MonitoringStatus,
  ): Promise<void> {
    await this.sql`
      UPDATE programs SET monitoring_status = ${status}, updated_at = now()
      WHERE id = ${programId}
    `;
  }

  private async findSnapshotByFingerprint(
    sql: QuerySql,
    programId: string,
    fingerprint: string,
  ): Promise<VersionSnapshot | null> {
    const [row] = await sql<SnapshotRow[]>`
      SELECT * FROM version_snapshots
      WHERE program_id = ${programId} AND fingerprint = ${fingerprint}
    `;
    return row === undefined ? null : mapSnapshot(row);
  }

  private insertSnapshot(
    sql: QuerySql,
    programId: string,
    candidate: SnapshotCandidate,
  ): Promise<SnapshotRow[]> {
    return sql<SnapshotRow[]>`
      INSERT INTO version_snapshots (
        program_id, program_address, programdata_address, deployment_slot,
        observed_slot, executable_hash, account_data_hash, executable_size,
        upgrade_authority, fingerprint, observed_at
      ) VALUES (
        ${programId}, ${candidate.programAddress}, ${candidate.programDataAddress},
        ${candidate.deploymentSlot.toString()}, ${candidate.observedSlot.toString()},
        ${candidate.executableHash}, ${candidate.accountDataHash},
        ${candidate.executableSize}, ${candidate.upgradeAuthority},
        ${candidate.fingerprint}, ${candidate.observedAt}
      )
      ON CONFLICT (program_id, fingerprint) DO NOTHING
      RETURNING *
    `;
  }
}

export function createPostgresStore(databaseUrl: string): {
  readonly close: () => Promise<void>;
  readonly store: PostgresProgramStore;
} {
  const sql = postgres(databaseUrl, { max: 10, prepare: false });
  return {
    close: async () => sql.end(),
    store: new PostgresProgramStore(sql),
  };
}
