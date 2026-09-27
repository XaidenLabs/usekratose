import {
  createExecutableStateChangeSnapshot,
  createOwnerChangeSnapshot,
  createSecurityEventCandidates,
  createSnapshotCandidate,
  resolveLoaderV3Deployment,
  type ReconciliationReason,
  type ReconciliationResult,
} from "@usekratose/core";

import {
  systemClock,
  type Clock,
  type ProgramIntelligenceGateway,
  type ProgramStore,
  type SolanaGateway,
} from "./ports.js";

export class ProgramReconciliationService {
  public constructor(
    private readonly gateway: SolanaGateway,
    private readonly store: ProgramStore,
    private readonly clock: Clock = systemClock,
    private readonly intelligence?: ProgramIntelligenceGateway,
  ) {}

  public async reconcile(
    programId: string,
    reason: ReconciliationReason,
  ): Promise<ReconciliationResult> {
    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const result = await this.reconcileOnce(programId, reason);
        if (result !== null) return result;
      }
      throw new Error(
        `Monitored program ${programId} changed repeatedly during reconciliation`,
      );
    } catch (error) {
      await this.store
        .recordReconciliation(programId, "degraded", this.clock.now())
        .catch(() => undefined);
      throw error;
    }
  }

  private async reconcileOnce(
    programId: string,
    _reason: ReconciliationReason,
  ): Promise<ReconciliationResult | null> {
    const program = await this.store.getProgram(programId);
    if (program === null) {
      throw new Error(`Monitored program ${programId} does not exist`);
    }

    const observedAt = this.clock.now();
    const previous = await this.store.getLatestSnapshot(program.id);
    const ownerRead = await this.gateway.getAccountInfo(program.address);
    const ownerChanged =
      previous !== null &&
      ownerRead.account !== null &&
      ownerRead.account.owner !== previous.programOwner;
    const executableStateChanged =
      previous !== null &&
      ownerRead.account !== null &&
      ownerRead.account.executable !== previous.programExecutable;
    const enrichment = await this.intelligence?.retrieve(program.address);
    const candidate = ownerChanged
      ? createOwnerChangeSnapshot({
          observedAt,
          observedSlot: ownerRead.contextSlot,
          previous,
          programExecutable:
            ownerRead.account?.executable ?? previous.programExecutable,
          programOwner: ownerRead.account?.owner ?? previous.programOwner,
        })
      : executableStateChanged
        ? createExecutableStateChangeSnapshot({
            observedAt,
            observedSlot: ownerRead.contextSlot,
            previous,
            programExecutable:
              ownerRead.account?.executable ?? previous.programExecutable,
          })
        : createSnapshotCandidate({
            ...(await resolveLoaderV3Deployment(this.gateway, program.address)),
            ...(enrichment === undefined ? {} : { enrichment }),
            observedAt,
            previous,
          });

    if (previous === null) {
      const snapshot = await this.store.persistBaseline(program.id, candidate);
      await this.store.recordReconciliation(program.id, "healthy", observedAt);
      return { fingerprint: snapshot.fingerprint, kind: "no-change" };
    }

    if (previous.fingerprint === candidate.fingerprint) {
      await this.store.recordReconciliation(program.id, "healthy", observedAt);
      return { fingerprint: candidate.fingerprint, kind: "no-change" };
    }

    const eventCandidates = createSecurityEventCandidates(
      previous,
      candidate,
      observedAt,
    );
    const transition = await this.store.persistTransition(
      program.id,
      previous.id,
      candidate,
      eventCandidates,
    );
    if (transition.outcome === "stale") return null;
    await this.store.recordReconciliation(program.id, "healthy", observedAt);

    if (!transition.inserted) {
      return {
        fingerprint: transition.snapshot.fingerprint,
        kind: "no-change",
      };
    }

    return {
      events: transition.events,
      kind: "change",
      snapshot: transition.snapshot,
    };
  }
}
