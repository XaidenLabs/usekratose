import type {
  BooleanRequirementChange,
  IdlChanges,
  JsonValue,
  NamedSchemaChange,
  NormalizedIdl,
  NormalizedIdlAccountRequirement,
  NormalizedIdlArgument,
  NormalizedIdlError,
  NormalizedIdlInstruction,
  SourceReference,
  SourceVerificationStatus,
} from "./domain.js";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function identifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new TypeError(`Invalid IDL identifier: ${JSON.stringify(value)}`);
  }
  return value;
}

export function canonicalizeJson(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalizeJson(item)]),
    );
  }
  throw new TypeError(`Cannot canonicalize JSON value of type ${typeof value}`);
}

function readBoolean(
  value: Readonly<Record<string, unknown>>,
  ...keys: readonly string[]
): boolean {
  return keys.some((key) => value[key] === true);
}

function normalizeInstructionAccounts(
  accounts: unknown,
  parent = "",
): readonly NormalizedIdlAccountRequirement[] {
  if (!Array.isArray(accounts)) return [];
  return accounts.flatMap((account) => {
    if (!isRecord(account) || typeof account.name !== "string") return [];
    const accountName = identifier(account.name);
    const name = parent === "" ? accountName : `${parent}.${accountName}`;
    if (Array.isArray(account.accounts)) {
      return normalizeInstructionAccounts(account.accounts, name);
    }
    return [
      {
        name,
        optional: readBoolean(account, "optional", "isOptional"),
        signer: readBoolean(account, "signer", "isSigner"),
        writable: readBoolean(account, "writable", "isWritable", "isMut"),
      },
    ];
  });
}

function normalizeArguments(args: unknown): readonly NormalizedIdlArgument[] {
  if (!Array.isArray(args)) return [];
  return args
    .flatMap((argument) =>
      isRecord(argument) && typeof argument.name === "string"
        ? [
            {
              name: identifier(argument.name),
              type: canonicalizeJson(argument.type),
            },
          ]
        : [],
    )
    .sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeInstructions(
  instructions: unknown,
): readonly NormalizedIdlInstruction[] {
  if (!Array.isArray(instructions)) return [];
  return instructions
    .flatMap((instruction) =>
      isRecord(instruction) && typeof instruction.name === "string"
        ? [
            {
              accounts: [
                ...normalizeInstructionAccounts(instruction.accounts),
              ].sort((left, right) => left.name.localeCompare(right.name)),
              arguments: normalizeArguments(
                instruction.args ?? instruction.arguments,
              ),
              name: identifier(instruction.name),
            },
          ]
        : [],
    )
    .sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeAccountTypes(
  accounts: unknown,
): NormalizedIdl["accountTypes"] {
  if (!Array.isArray(accounts)) return [];
  return accounts
    .flatMap((account) =>
      isRecord(account) && typeof account.name === "string"
        ? [
            {
              name: identifier(account.name),
              type: canonicalizeJson(account.type),
            },
          ]
        : [],
    )
    .sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeErrors(errors: unknown): readonly NormalizedIdlError[] {
  if (!Array.isArray(errors)) return [];
  return errors
    .flatMap((error) => {
      if (!isRecord(error) || typeof error.name !== "string") return [];
      return [
        {
          code:
            typeof error.code === "number" && Number.isFinite(error.code)
              ? error.code
              : null,
          message:
            typeof (error.message ?? error.msg) === "string"
              ? String(error.message ?? error.msg)
              : null,
          name: identifier(error.name),
        },
      ];
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function normalizeIdl(idl: unknown): NormalizedIdl {
  if (!isRecord(idl)) throw new TypeError("IDL must be a JSON object");
  const root = isRecord(idl.program) ? idl.program : idl;
  return {
    accountTypes: normalizeAccountTypes(
      root.definedTypes ?? root.types ?? root.accounts,
    ),
    errors: normalizeErrors(root.errors),
    instructions: normalizeInstructions(root.instructions),
  };
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(canonicalizeJson(left)) ===
    JSON.stringify(canonicalizeJson(right))
  );
}

function booleanChanges(
  previous: readonly NormalizedIdlAccountRequirement[],
  current: readonly NormalizedIdlAccountRequirement[],
  property: "optional" | "signer" | "writable",
): readonly BooleanRequirementChange[] {
  const currentByName = new Map(
    current.map((account) => [account.name, account]),
  );
  return previous.flatMap((account) => {
    const next = currentByName.get(account.name);
    return next !== undefined && account[property] !== next[property]
      ? [
          {
            account: account.name,
            current: next[property],
            previous: account[property],
          },
        ]
      : [];
  });
}

function namedChanges<T extends { readonly name: string }>(
  previous: readonly T[],
  current: readonly T[],
  value: (item: T) => JsonValue | NormalizedIdlError,
): readonly NamedSchemaChange[] {
  const previousByName = new Map(previous.map((item) => [item.name, item]));
  const currentByName = new Map(current.map((item) => [item.name, item]));
  return [...new Set([...previousByName.keys(), ...currentByName.keys()])]
    .sort()
    .flatMap((name) => {
      const before = previousByName.get(name);
      const after = currentByName.get(name);
      const previousValue = before === undefined ? null : value(before);
      const currentValue = after === undefined ? null : value(after);
      return jsonEqual(previousValue, currentValue)
        ? []
        : [{ current: currentValue, name, previous: previousValue }];
    });
}

export function diffNormalizedIdls(
  previous: NormalizedIdl | null,
  current: NormalizedIdl | null,
): IdlChanges {
  if (previous === null || current === null) {
    return {
      accountTypesChanged: [],
      errorsChanged: [],
      instructionSchemasChanged: [],
    };
  }
  const previousByName = new Map(
    previous.instructions.map((instruction) => [instruction.name, instruction]),
  );
  const currentByName = new Map(
    current.instructions.map((instruction) => [instruction.name, instruction]),
  );
  const instructionSchemasChanged = [...previousByName.keys()]
    .filter((name) => currentByName.has(name))
    .sort()
    .flatMap((name) => {
      const before = previousByName.get(name);
      const after = currentByName.get(name);
      if (
        before === undefined ||
        after === undefined ||
        jsonEqual(before, after)
      ) {
        return [];
      }
      const beforeAccounts = new Map(
        before.accounts.map((account) => [account.name, account]),
      );
      const afterAccounts = new Map(
        after.accounts.map((account) => [account.name, account]),
      );
      return [
        {
          accountsAdded: after.accounts.filter(
            (account) => !beforeAccounts.has(account.name),
          ),
          accountsRemoved: before.accounts.filter(
            (account) => !afterAccounts.has(account.name),
          ),
          argumentsChanged: !jsonEqual(before.arguments, after.arguments),
          currentArguments: after.arguments,
          name,
          optionalChanges: booleanChanges(
            before.accounts,
            after.accounts,
            "optional",
          ),
          previousArguments: before.arguments,
          signerChanges: booleanChanges(
            before.accounts,
            after.accounts,
            "signer",
          ),
          writableChanges: booleanChanges(
            before.accounts,
            after.accounts,
            "writable",
          ),
        },
      ];
    });

  return {
    accountTypesChanged: namedChanges(
      previous.accountTypes,
      current.accountTypes,
      (account) => account.type,
    ),
    errorsChanged: namedChanges(
      previous.errors,
      current.errors,
      (error) => error,
    ),
    instructionSchemasChanged,
  };
}

export function normalizeSourceReference(
  metadata: unknown,
): SourceReference | null {
  if (!isRecord(metadata)) return null;
  const repository =
    metadata.repository ?? metadata.repositoryUrl ?? metadata.source_code;
  if (typeof repository !== "string" || repository.trim() === "") return null;
  let repositoryUrl: URL;
  try {
    repositoryUrl = new URL(repository.trim());
  } catch {
    return null;
  }
  if (
    (repositoryUrl.protocol !== "https:" &&
      repositoryUrl.protocol !== "http:") ||
    repositoryUrl.username !== "" ||
    repositoryUrl.password !== ""
  ) {
    return null;
  }
  const revision =
    metadata.revision ?? metadata.sourceRevision ?? metadata.source_revision;
  const status =
    metadata.sourceVerificationStatus ?? metadata.source_verification_status;
  const verificationStatus: SourceVerificationStatus =
    status === "verified" || status === "unverified" ? status : "unverified";
  return {
    repositoryUrl: repositoryUrl.toString(),
    revision:
      typeof revision === "string" &&
      revision.trim() !== "" &&
      revision.length <= 200 &&
      !/[\u0000-\u001f\u007f]/.test(revision)
        ? revision.trim()
        : null,
    verificationStatus,
  };
}
