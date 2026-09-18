import {
  createSnapshotCandidate,
  diffSnapshots,
  resolveLoaderV3Deployment,
  type ReconciliationReason,
  type ReconciliationResult,
} from "@usekratose/core";

import {
  systemClock,
  type Clock,
  type ProgramStore,
  type SolanaGateway,
} from "./ports.js";

export class ProgramReconciliationService {
  public constructor(
    private readonly gateway: SolanaGateway,
    private readonly store: ProgramStore,
    private readonly clock: Clock = systemClock,
  ) {}

  public async reconcile(
    programId: string,
    _reason: ReconciliationReason,
  ): Promise<ReconciliationResult> {
    const program = await this.store.getProgram(programId);
    if (program === null) {
      throw new Error(`Monitored program ${programId} does not exist`);
    }

    try {
      const resolved = await resolveLoaderV3Deployment(
        this.gateway,
        program.address,
      );
      const observedAt = this.clock.now();
      const candidate = createSnapshotCandidate({
        ...resolved,
        observedAt,
      });
      const previous = await this.store.getLatestSnapshot(program.id);

      if (previous === null) {
        const snapshot = await this.store.persistBaseline(
          program.id,
          candidate,
        );
        await this.store.recordReconciliation(
          program.id,
          "healthy",
          observedAt,
        );
        return { fingerprint: snapshot.fingerprint, kind: "no-change" };
      }

      if (previous.fingerprint === candidate.fingerprint) {
        await this.store.recordReconciliation(
          program.id,
          "healthy",
          observedAt,
        );
        return { fingerprint: candidate.fingerprint, kind: "no-change" };
      }

      const eventCandidate = diffSnapshots(previous, candidate, observedAt);
      const transition = await this.store.persistTransition(
        candidate,
        eventCandidate,
      );
      await this.store.recordReconciliation(program.id, "healthy", observedAt);

      if (!transition.inserted) {
        return {
          fingerprint: transition.snapshot.fingerprint,
          kind: "no-change",
        };
      }

      return {
        event: transition.event,
        kind: "change",
        snapshot: transition.snapshot,
      };
    } catch (error) {
      await this.store
        .recordReconciliation(program.id, "degraded", this.clock.now())
        .catch(() => undefined);
      throw error;
    }
  }
}
