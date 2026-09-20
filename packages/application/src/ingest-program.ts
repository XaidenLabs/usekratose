import {
  assertSolanaAddress,
  createSnapshotCandidate,
  resolveLoaderV3Deployment,
  type Cluster,
  type MonitoredProgram,
  type VersionSnapshot,
} from "@usekratose/core";

import {
  systemClock,
  type Clock,
  type ProgramIntelligenceGateway,
  type ProgramStore,
  type SolanaGateway,
} from "./ports.js";

export interface IngestProgramResult {
  readonly createdBaseline: boolean;
  readonly program: MonitoredProgram;
  readonly snapshot: VersionSnapshot;
}

export class ProgramIngestionService {
  public constructor(
    private readonly gateway: SolanaGateway,
    private readonly store: ProgramStore,
    private readonly clock: Clock = systemClock,
    private readonly intelligence?: ProgramIntelligenceGateway,
  ) {}

  public async ingest(input: {
    readonly address: string;
    readonly cluster: Cluster;
    readonly organizationId: string;
  }): Promise<IngestProgramResult> {
    assertSolanaAddress(input.address);

    const resolved = await resolveLoaderV3Deployment(
      this.gateway,
      input.address,
    );
    const program = await this.store.createOrGetProgram({
      address: input.address,
      cluster: input.cluster,
      programDataAddress: resolved.deployment.programDataAddress,
      status: "baselining",
    });
    await this.store.addOrganizationMonitor(input.organizationId, program.id);

    const existing = await this.store.getLatestSnapshot(program.id);
    if (existing !== null) {
      await this.store.recordReconciliation(
        program.id,
        "healthy",
        this.clock.now(),
      );
      return { createdBaseline: false, program, snapshot: existing };
    }

    const enrichment = await this.intelligence?.retrieve(input.address);
    const candidate = createSnapshotCandidate({
      ...resolved,
      ...(enrichment === undefined ? {} : { enrichment }),
      observedAt: this.clock.now(),
      previous: null,
    });
    const snapshot = await this.store.persistBaseline(program.id, candidate);
    await this.store.recordReconciliation(
      program.id,
      "healthy",
      this.clock.now(),
    );

    return { createdBaseline: true, program, snapshot };
  }
}
