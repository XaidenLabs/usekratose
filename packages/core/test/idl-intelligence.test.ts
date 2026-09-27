import { describe, expect, it } from "vitest";
import type { NormalizedIdl } from "../src/domain.js";

import { diffNormalizedIdls, normalizeIdl } from "../src/idl-intelligence.js";

function idl(
  overrides: {
    readonly accounts?: readonly unknown[];
    readonly errors?: readonly unknown[];
    readonly instructions?: readonly unknown[];
    readonly types?: readonly unknown[];
  } = {},
): unknown {
  return {
    accounts: overrides.accounts ?? [],
    errors: overrides.errors ?? [],
    instructions: overrides.instructions ?? [],
    types: overrides.types ?? [],
  };
}

function instruction(input: {
  readonly args?: readonly unknown[];
  readonly signer?: boolean;
  readonly writable?: boolean;
  readonly name: string;
}): unknown {
  return {
    accounts: [
      {
        name: "vault",
        signer: input.signer ?? false,
        writable: input.writable ?? false,
      },
    ],
    args: input.args ?? [],
    name: input.name,
  };
}

describe("IDL intelligence", () => {
  it("normalizes a program with no exposed IDL as an empty schema", () => {
    expect(normalizeIdl({})).toEqual({
      accountTypes: [],
      errors: [],
      instructions: [],
    });
  });

  it("normalizes Codama Program Metadata IDLs", () => {
    expect(
      normalizeIdl({
        kind: "rootNode",
        program: {
          definedTypes: [],
          errors: [],
          instructions: [
            {
              accounts: [
                {
                  isSigner: true,
                  isWritable: true,
                  kind: "instructionAccountNode",
                  name: "authority",
                },
              ],
              arguments: [],
              kind: "instructionNode",
              name: "write",
            },
          ],
        },
        standard: "codama",
      }).instructions[0],
    ).toMatchObject({
      accounts: [{ name: "authority", signer: true, writable: true }],
      name: "write",
    });
  });

  it("produces no changes for semantically identical IDLs", () => {
    const value = normalizeIdl(
      idl({ instructions: [instruction({ name: "deposit" })] }),
    );
    expect(diffNormalizedIdls(value, value)).toEqual({
      accountTypesChanged: [],
      errorsChanged: [],
      instructionSchemasChanged: [],
    });
  });

  it("ignores JSON object key ordering introduced by JSONB storage", () => {
    const previous = JSON.parse(
      '{"accountTypes":[{"name":"Vault","type":{"fields":[{"name":"authority","type":"pubkey"}],"kind":"struct"}}],"errors":[{"code":6000,"message":"Denied","name":"Denied"}],"instructions":[{"accounts":[{"name":"vault","optional":false,"signer":false,"writable":true}],"arguments":[{"name":"amount","type":"u64"}],"name":"deposit"}]}',
    ) as NormalizedIdl;
    const current = JSON.parse(
      '{"errors":[{"name":"Denied","message":"Denied","code":6000}],"instructions":[{"name":"deposit","arguments":[{"type":"u64","name":"amount"}],"accounts":[{"writable":true,"signer":false,"optional":false,"name":"vault"}]}],"accountTypes":[{"type":{"kind":"struct","fields":[{"type":"pubkey","name":"authority"}]},"name":"Vault"}]}',
    ) as NormalizedIdl;

    expect(diffNormalizedIdls(previous, current)).toEqual({
      accountTypesChanged: [],
      errorsChanged: [],
      instructionSchemasChanged: [],
    });
  });

  it("leaves instruction additions and removals to the event name diff", () => {
    const previous = normalizeIdl(
      idl({ instructions: [instruction({ name: "deposit" })] }),
    );
    const current = normalizeIdl(
      idl({ instructions: [instruction({ name: "withdraw" })] }),
    );
    expect(
      diffNormalizedIdls(previous, current).instructionSchemasChanged,
    ).toEqual([]);
  });

  it("detects signer requirement changes", () => {
    const previous = normalizeIdl(
      idl({ instructions: [instruction({ name: "withdraw" })] }),
    );
    const current = normalizeIdl(
      idl({
        instructions: [instruction({ name: "withdraw", signer: true })],
      }),
    );
    expect(
      diffNormalizedIdls(previous, current).instructionSchemasChanged[0]
        ?.signerChanges,
    ).toEqual([{ account: "vault", current: true, previous: false }]);
  });

  it("detects account mutability changes", () => {
    const previous = normalizeIdl(
      idl({ instructions: [instruction({ name: "withdraw" })] }),
    );
    const current = normalizeIdl(
      idl({
        instructions: [instruction({ name: "withdraw", writable: true })],
      }),
    );
    expect(
      diffNormalizedIdls(previous, current).instructionSchemasChanged[0]
        ?.writableChanges,
    ).toEqual([{ account: "vault", current: true, previous: false }]);
  });

  it("detects argument schema changes", () => {
    const previous = normalizeIdl(
      idl({
        instructions: [
          instruction({
            args: [{ name: "amount", type: "u64" }],
            name: "withdraw",
          }),
        ],
      }),
    );
    const current = normalizeIdl(
      idl({
        instructions: [
          instruction({
            args: [{ name: "amount", type: "u128" }],
            name: "withdraw",
          }),
        ],
      }),
    );
    expect(
      diffNormalizedIdls(previous, current).instructionSchemasChanged[0]
        ?.argumentsChanged,
    ).toBe(true);
  });

  it("detects account type and error definition changes", () => {
    const previous = normalizeIdl(
      idl({
        errors: [{ code: 6000, msg: "Old", name: "Denied" }],
        types: [{ name: "Vault", type: { fields: [], kind: "struct" } }],
      }),
    );
    const current = normalizeIdl(
      idl({
        errors: [{ code: 6000, msg: "New", name: "Denied" }],
        types: [
          {
            name: "Vault",
            type: {
              fields: [{ name: "authority", type: "pubkey" }],
              kind: "struct",
            },
          },
        ],
      }),
    );
    const changes = diffNormalizedIdls(previous, current);
    expect(changes.accountTypesChanged.map((change) => change.name)).toEqual([
      "Vault",
    ]);
    expect(changes.errorsChanged.map((change) => change.name)).toEqual([
      "Denied",
    ]);
  });
});
