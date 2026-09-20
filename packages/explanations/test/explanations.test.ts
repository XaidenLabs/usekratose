import { describe, expect, it } from "vitest";
import type { SecurityEvent } from "@usekratose/core";

import {
  ExplanationService,
  type ExplanationProvider,
  type ExplanationStore,
  type SecurityExplanation,
  type UnexplainedSecurityEvent,
} from "../src/index.js";

const event: SecurityEvent = {
  currentSnapshotId: "snapshot-v2",
  detectedAt: new Date("2026-09-20T12:00:00Z"),
  evidence: {
    instructions: ["adminWithdraw"],
    privilegedLooking: ["adminWithdraw"],
  },
  id: "event-1",
  previousSnapshotId: "snapshot-v1",
  programId: "program-1",
  severity: "high",
  type: "INSTRUCTION_ADDED",
};

const explanation: SecurityExplanation = {
  auditorQuestions: [
    "Is the admin signer constrained to the expected authority?",
  ],
  caveat: "This explanation does not prove exploitability or safety.",
  possibleImpact:
    "If authorization is weak, privileged withdrawals may be possible.",
  remediationChecklist: ["Review signer and vault constraints."],
  reviewAreas: ["adminWithdraw account constraints"],
  summary: "A privileged-looking instruction was added.",
};

class FakeStore implements ExplanationStore {
  public pending: UnexplainedSecurityEvent[] = [
    { event, programAddress: "Program1111111111111111111111111111111111" },
  ];
  public saved: Array<{
    readonly evidenceInput: Readonly<Record<string, unknown>>;
  }> = [];

  public async listEventsMissingExplanation(): Promise<
    readonly UnexplainedSecurityEvent[]
  > {
    const result = [...this.pending];
    this.pending = [];
    return result;
  }

  public async saveExplanation(input: {
    readonly evidenceInput: Readonly<Record<string, unknown>>;
  }): Promise<void> {
    this.saved.push(input);
  }
}

class FakeProvider implements ExplanationProvider {
  public readonly model = "fixture-model";
  public readonly name = "fixture";
  public evidence: Readonly<Record<string, unknown>> | null = null;

  public async explain(
    evidence: Readonly<Record<string, unknown>>,
  ): Promise<SecurityExplanation> {
    this.evidence = evidence;
    return explanation;
  }
}

describe("Milestone 7 explanation boundary", () => {
  it("uses stored deterministic evidence and remains idempotent", async () => {
    const store = new FakeStore();
    const provider = new FakeProvider();
    const service = new ExplanationService(store, provider);

    await expect(service.processPending()).resolves.toBe(1);
    await expect(service.processPending()).resolves.toBe(0);
    expect(provider.evidence).toMatchObject({
      eventType: "INSTRUCTION_ADDED",
      severity: "high",
    });
    expect(store.saved).toHaveLength(1);
  });
});
