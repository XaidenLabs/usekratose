import { describe, expect, it } from "vitest";
import type { SecurityEvent } from "@usekratose/core";

import {
  ExplanationService,
  applyGroundedPatches,
  GeminiProgramAnalysisProvider,
  OllamaExplanationProvider,
  type ExplanationProvider,
  type ExplanationStore,
  type ProgramAnalysisEvidence,
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
  public lastQuery:
    Parameters<ExplanationStore["listEventsMissingExplanation"]>[0] | null =
    null;
  public pending: UnexplainedSecurityEvent[] = [
    { event, programAddress: "Program1111111111111111111111111111111111" },
  ];
  public saved: Array<{
    readonly evidenceInput: Readonly<Record<string, unknown>>;
  }> = [];

  public async listEventsMissingExplanation(
    input: Parameters<ExplanationStore["listEventsMissingExplanation"]>[0],
  ): Promise<readonly UnexplainedSecurityEvent[]> {
    this.lastQuery = input;
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

  it("can target one event without processing unrelated evidence", async () => {
    const store = new FakeStore();
    const service = new ExplanationService(store, new FakeProvider());

    await expect(
      service.processPending(1, { eventId: "event-1", programId: "program-1" }),
    ).resolves.toBe(1);
    expect(store.lastQuery).toMatchObject({
      eventId: "event-1",
      limit: 1,
      programId: "program-1",
    });
  });

  it("requests and validates structured local Ollama output", async () => {
    let requestBody: unknown;
    const provider = new OllamaExplanationProvider(
      "qwen3:4b-instruct",
      "http://127.0.0.1:11434/",
      async (_input, init) => {
        requestBody = JSON.parse(String(init?.body));
        return new Response(
          `${JSON.stringify({ message: { content: JSON.stringify(explanation) } })}\n`,
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      },
    );

    await expect(provider.explain(event.evidence)).resolves.toEqual(
      explanation,
    );
    expect(requestBody).toMatchObject({
      format: "json",
      model: "qwen3:4b-instruct",
      options: { num_predict: 256 },
      stream: true,
      think: false,
    });
  });

  it("grounds Gemini corrections in stored events and snapshots", async () => {
    const evidence: ProgramAnalysisEvidence = {
      currentSnapshot: {
        executableHash: "sha256:v2",
        id: "snapshot-v2",
        verificationStatus: "stale",
      },
      events: [
        {
          id: "event-upgrade",
          severity: "high",
          type: "PROGRAM_UPGRADED",
        },
        {
          id: "event-idl",
          severity: "medium",
          type: "INSTRUCTION_ADDED",
        },
      ],
      program: {
        address: "Program1111111111111111111111111111111111",
        securityStatus: "review_required",
      },
      snapshots: [
        { executableHash: "sha256:v2", id: "snapshot-v2" },
        { executableHash: "sha256:v1", id: "snapshot-v1" },
      ],
      sourceFiles: [
        {
          content: "pub fn withdraw(amount: u64) { transfer(amount); }",
          hash: "sha256:source-v1",
          path: "programs/vault/src/lib.rs",
        },
      ],
    };
    let requestBody: unknown;
    let requestHeaders: Headers | undefined;
    const provider = new GeminiProgramAnalysisProvider(
      "test-api-key",
      "gemini-fixture",
      async (_input, init) => {
        requestBody = JSON.parse(String(init?.body));
        requestHeaders = new Headers(init?.headers);
        return Response.json({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      caveat: "Review against source before applying changes.",
                      corrections: [
                        {
                          correction:
                            "Review the upgraded deployment before restoring trust.",
                          fixes: [
                            {
                              action:
                                "Compare the verified source build with snapshot-v2.",
                              rationale:
                                "The executable changed and verification is stale.",
                            },
                          ],
                          reason:
                            "A deterministic program upgrade event was recorded.",
                          patches: [],
                          relatedEventIds: ["event-upgrade", "invented-event"],
                          relatedSnapshotIds: [
                            "snapshot-v2",
                            "invented-snapshot",
                          ],
                          title: "Reverify the upgraded deployment",
                        },
                        {
                          correction:
                            "Review the new instruction account constraints.",
                          fixes: [
                            {
                              action:
                                "Confirm signer and writable requirements.",
                              rationale:
                                "The IDL reports a newly added instruction.",
                            },
                          ],
                          reason:
                            "A deterministic instruction-added event was recorded.",
                          patches: [
                            {
                              after:
                                "pub fn withdraw(amount: u64) { require_admin(); transfer(amount); }",
                              before:
                                "pub fn withdraw(amount: u64) { transfer(amount); }",
                              path: "programs/vault/src/lib.rs",
                              rationale:
                                "Require explicit authorization before transfer.",
                            },
                            {
                              after: "invented",
                              before: "missing",
                              path: "programs/vault/src/lib.rs",
                              rationale: "Must be discarded.",
                            },
                          ],
                          relatedEventIds: ["event-idl"],
                          relatedSnapshotIds: ["snapshot-v1", "snapshot-v2"],
                          title: "Review the added instruction",
                        },
                      ],
                      reviewPriorities: [
                        "Reproduce the current executable from verified source.",
                        "Review added instruction constraints.",
                      ],
                      summary:
                        "The deployment changed and requires human review.",
                    }),
                  },
                ],
              },
            },
          ],
        });
      },
    );

    const result = await provider.analyze(evidence);

    expect(result.corrections[0]).toMatchObject({
      id: "analysis-finding-1",
      relatedEventIds: ["event-upgrade"],
      relatedSnapshotIds: ["snapshot-v2"],
      severity: "high",
    });
    expect(result.corrections[1]).toMatchObject({
      patches: [expect.objectContaining({ path: "programs/vault/src/lib.rs" })],
      id: "analysis-finding-2",
      severity: "medium",
    });
    expect(requestHeaders?.get("x-goog-api-key")).toBe("test-api-key");
    expect(requestBody).toMatchObject({
      generationConfig: {
        responseFormat: {
          text: { mimeType: "APPLICATION_JSON" },
        },
        temperature: 0.2,
      },
    });
    expect(JSON.stringify(requestBody)).toContain("event-upgrade");
    expect(JSON.stringify(requestBody)).not.toContain("additionalProperties");
    expect(JSON.stringify(requestBody)).not.toContain("maxLength");
    expect(JSON.stringify(requestBody)).not.toContain("maxItems");
    expect(JSON.stringify(requestBody)).not.toContain("minItems");
    expect(JSON.stringify(requestBody)).not.toContain("test-api-key");
  });

  it("applies only an unambiguous exact replacement", () => {
    expect(
      applyGroundedPatches("before middle after", [
        { after: "secured", before: "middle" },
      ]),
    ).toBe("before secured after");
    expect(() =>
      applyGroundedPatches("repeat repeat", [
        { after: "secured", before: "repeat" },
      ]),
    ).toThrow("exactly once");
  });
});
